// Trainee's view: maker-checker leg of the 3-signal placement verification.
//
// Flow on screen:
//   1. Hero card summarising the offer the TP declared
//   2. Trainee must upload their OWN copy of the offer letter (independent
//      signal). If they have no copy, they can fall back to TC's copy.
//   3. We OCR whichever copy is freshest and show field-by-field confirm.
//      Trainee can hit Edit on any row to override.
//   4. Final 4-button decision:
//        Yes, I joined          → confirms placement (state advances)
//        Edit & confirm         → confirms with edited fields (state advances)
//        No, I did NOT join     → opens categorized checklist
//        Raise dispute          → opens grievance form
//
// All four paths POST to `/api/placements/:id/trainee-confirm`; the dispute
// path also persists a `PlacementGrievance` row server-side.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { applyCredit } from '../../utils/aiCredits.js'
import { readFileAsDataUrl, ACCEPT_IMAGE } from '../../utils/fileUpload.js'
import {
  CheckCircle2, XCircle, IndianRupee, Calendar, Building2,
  ShieldCheck, AlertTriangle, Briefcase, MapPin, Upload, Loader2,
  FileText, Edit3, Save, RefreshCw, Flag, MessageSquareWarning,
} from 'lucide-react'
import VerificationBadge from './_VerificationBadge.jsx'

const DENY_CATEGORIES = [
  { key: 'no_interview',         label: 'My TC never conducted a placement interview' },
  { key: 'no_recruiter_visit',   label: 'No recruitment partner ever visited the TC' },
  { key: 'unknown_employer',     label: 'I don\'t recognise this employer at all' },
  { key: 'wrong_trainee',        label: 'This is not me — wrong trainee record' },
  { key: 'never_offered',        label: 'I was never offered a job by this employer' },
  { key: 'fake_letter',          label: 'The offer letter looks fabricated' },
  { key: 'other',                label: 'Other (write below)' },
]

const DISPUTE_CATEGORIES = [
  { key: 'salary_lower',         label: 'Salary lower than what was promised' },
  { key: 'joining_delayed',      label: 'Joining date is months away from offer date' },
  { key: 'role_different',       label: 'Role / job profile is different from the letter' },
  { key: 'venue_different',      label: 'Venue / city is different from what was agreed' },
  { key: 'no_appointment_letter',label: 'No formal appointment letter from the employer' },
  { key: 'notice_unfair',        label: 'Notice period / bond clauses are unfair' },
  { key: 'unsafe',               label: 'Workplace feels unsafe / harassment' },
  { key: 'other',                label: 'Other (write below)' },
]

const OCR_FIELD_DEFS = [
  { key: 'placementDate',  label: 'Date of placement',  icon: Calendar,    kind: 'date'  },
  { key: 'onboardingDate', label: 'Date of onboarding', icon: Calendar,    kind: 'date'  },
  { key: 'joiningDate',    label: 'Joining date',       icon: Calendar,    kind: 'date'  },
  { key: 'salaryMonthly',  label: 'Monthly salary',     icon: IndianRupee, kind: 'inr'   },
  { key: 'noticePeriod',   label: 'Notice period',      icon: Calendar,    kind: 'text'  },
  { key: 'venue',          label: 'Venue / address',    icon: MapPin,      kind: 'text'  },
]

function fmt(value, kind) {
  if (value == null || value === '') return '—'
  if (kind === 'date') {
    const d = new Date(value); return isNaN(d) ? String(value) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (kind === 'inr') return `₹${Number(value).toLocaleString('en-IN')}`
  return String(value)
}

export default function PlacementConfirmCanvas({ context }) {
  const { showToast, user } = useApp() || {}
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Upload + OCR
  const [traineeLetterUrl, setTraineeLetterUrl] = useState(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrError, setOcrError] = useState(null)

  // Editable OCR fields snapshot (starts from server OCR, mutated by Edit rows)
  const [ocrEdits, setOcrEdits] = useState({})
  const [editingField, setEditingField] = useState(null)

  // Decision flow modal state
  const [mode, setMode] = useState('decide')       // decide | deny | dispute
  const [denyChecks, setDenyChecks] = useState({})
  const [disputeChecks, setDisputeChecks] = useState({})
  const [note, setNote] = useState('')

  async function load() {
    setLoading(true)
    try {
      if (context?.placementId) {
        const r = await api.placement(context.placementId)
        setPlacement(r.placement)
      } else {
        const list = await api.placements()
        const target = (list.placements || []).find(p => !p.traineeConfirmedAt && p.state === 'claimed_unverified')
        setPlacement(target || list.placements?.[0] || null)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [context?.placementId])

  // Hydrate editable OCR from placement.offerLetterOcr (server JSON string)
  const serverOcr = useMemo(() => {
    try { return placement?.offerLetterOcr ? JSON.parse(placement.offerLetterOcr) : null } catch { return null }
  }, [placement])
  useEffect(() => {
    if (serverOcr) setOcrEdits(prev => Object.keys(prev).length ? prev : { ...serverOcr })
  }, [serverOcr])

  async function handleFile(file) {
    setOcrError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setTraineeLetterUrl(dataUrl)
      setOcrBusy(true)
      const { ocr } = await api.ocrOfferLetter(dataUrl, file.name)
      // Upload + new OCR replaces stale OCR on the server
      const r = await api.traineeUploadOffer(placement.id, { dataUrl, ocr })
      setPlacement(r.placement)
      setOcrEdits(prev => ({ ...prev, ...ocr }))
    } catch (err) {
      setOcrError(err.message || 'Could not read this file. Try a clearer photo.')
    } finally { setOcrBusy(false) }
  }

  async function ackOcr() {
    try {
      await api.ocrAckPlacement(placement.id, ocrEdits)
      showToast?.({ kind: 'success', text: 'Letter details confirmed.' })
      await load()
    } catch { showToast?.({ kind: 'danger', text: 'Could not save.' }) }
  }

  function pickedKeys(map) { return Object.entries(map).filter(([, v]) => v).map(([k]) => k) }

  async function submitDecision(decision) {
    if (!placement) return
    if (decision === 'no' && pickedKeys(denyChecks).length === 0) {
      showToast?.({ kind: 'warn', text: 'Pick at least one reason.' }); return
    }
    if (decision === 'dispute' && pickedKeys(disputeChecks).length === 0) {
      showToast?.({ kind: 'warn', text: 'Pick at least one grievance category.' }); return
    }
    setSubmitting(true)
    try {
      // Snapshot any unsaved OCR edits in the same round-trip
      if (Object.keys(ocrEdits).length) {
        try { await api.ocrAckPlacement(placement.id, ocrEdits) } catch {}
      }
      const body = {
        decision,
        note: note?.trim() || undefined,
        denyCategories:    decision === 'no'      ? pickedKeys(denyChecks)    : undefined,
        disputeCategories: decision === 'dispute' ? pickedKeys(disputeChecks) : undefined,
      }
      const r = await api.traineeConfirmPlc(placement.id, body)
      setPlacement(r.placement); setMode('decide'); setNote('')
      setDenyChecks({}); setDisputeChecks({})
      if (decision === 'yes') {
        const next = applyCredit(user?.id, 'approve_placement', { uniqueId: placement.id })
        showToast?.({ kind: 'success', text: `Confirmed. +50 AI credits (balance ${next.balance}).` })
      } else if (decision === 'no') {
        showToast?.({ kind: 'warn', text: 'Rejection recorded. NSDC + SSC will investigate.' })
      } else {
        showToast?.({ kind: 'warn', text: 'Grievance raised. NSDC officer will follow up.' })
      }
    } catch {
      showToast?.({ kind: 'danger', text: 'Could not submit. Try again.' })
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6 text-[13px] text-txt-secondary">Loading your pending placements…</div>
  if (!placement) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
          <div className="text-[15px] font-bold text-txt-primary">No placements awaiting your confirmation</div>
          <div className="text-[12px] text-txt-secondary mt-1 max-w-md mx-auto">
            When your training partner declares a placement for you, you'll see it here for an independent confirmation.
          </div>
        </div>
      </div>
    )
  }

  const traineeAlreadyResponded = !!placement.traineeConfirmedAt || placement.state === 'disputed' || placement.state === 'conflicted'
  const tcLetterUrl = placement.appointmentLetterUrl
  const traineeServerUrl = placement.offerLetterTraineeUrl

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-violet-50/70 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700">Confirm Placement</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Did you actually join this job?</h2>
        <p className="text-[12px] text-txt-secondary mt-1">
          Upload your copy of the offer letter, confirm what we read from it, then tell us what happened.
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Offer card */}
        <div className="rounded-2xl border border-bdr bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">Role</div>
                <div className="font-bold text-[16px] text-txt-primary leading-tight truncate">{placement.role}</div>
                <div className="text-[12px] text-txt-secondary mt-0.5 inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{placement.employer?.name}
                </div>
              </div>
            </div>
            <VerificationBadge state={placement.state} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-bdr-light text-[12px]">
            <Stat icon={IndianRupee} label="Monthly CTC" value={`₹${Number(placement.ctcMonthly || 0).toLocaleString('en-IN')}`} />
            <Stat icon={Calendar}    label="Joining"     value={placement.joiningDate ? new Date(placement.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            <Stat icon={MapPin}      label="Location"    value={placement.employer?.city || placement.location || '—'} />
          </div>
        </div>

        {/* Letter upload + OCR confirm */}
        {!traineeAlreadyResponded && (
          <div className="rounded-2xl border border-bdr bg-white p-4 space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-txt-primary">
              <FileText className="w-4 h-4 text-violet-600" /> Your copy of the offer letter
            </div>
            <div className="text-[11px] text-txt-secondary -mt-1">
              {tcLetterUrl
                ? 'Your TC already uploaded a copy. Upload yours too — if they differ, we flag it.'
                : 'Please upload a clear photo of the appointment / offer letter your employer gave you.'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tcLetterUrl && <LetterThumb label="TC copy" url={tcLetterUrl} />}
              {(traineeLetterUrl || traineeServerUrl) && <LetterThumb label="Your copy" url={traineeLetterUrl || traineeServerUrl} />}
            </div>

            {!traineeServerUrl && !traineeLetterUrl && (
              <label className="block">
                <div className="rounded-xl border-2 border-dashed border-bdr px-4 py-5 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30">
                  <Upload className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                  <div className="text-[12px] font-bold text-txt-primary">Tap to upload your copy</div>
                  <div className="text-[11px] text-txt-secondary mt-0.5">JPG / PNG, up to 4 MB</div>
                </div>
                <input type="file" accept={ACCEPT_IMAGE} className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            )}
            {(traineeServerUrl || traineeLetterUrl) && (
              <label className="inline-flex items-center gap-2 text-[11px] text-violet-700 cursor-pointer">
                <RefreshCw className="w-3 h-3" /> Replace
                <input type="file" accept={ACCEPT_IMAGE} className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            )}

            {ocrBusy && <div className="inline-flex items-center gap-2 text-[12px] text-violet-700 font-medium"><Loader2 className="w-4 h-4 animate-spin" /> Reading your letter…</div>}
            {ocrError && <div className="inline-flex items-center gap-1 text-[12px] text-danger font-bold"><AlertTriangle className="w-4 h-4" /> {ocrError}</div>}

            {/* OCR field rows */}
            {(serverOcr || Object.keys(ocrEdits).length > 0) && (
              <div className="rounded-xl border border-bdr-light bg-surface-page/40 p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider mb-1">
                  Confirm what we read from the letter
                </div>
                {OCR_FIELD_DEFS.map(({ key, label, icon, kind }) => (
                  <OcrRow key={key} field={key} label={label} icon={icon} kind={kind}
                    value={ocrEdits[key]}
                    editing={editingField === key}
                    onEdit={() => setEditingField(key)}
                    onSave={(v) => { setOcrEdits({ ...ocrEdits, [key]: v }); setEditingField(null) }}
                    onCancel={() => setEditingField(null)} />
                ))}
                <button onClick={ackOcr}
                  className="mt-2 w-full py-2 rounded-pill bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold">
                  Lock in these details
                </button>
                {placement.offerLetterTraineeAckAt && (
                  <div className="text-[11px] text-emerald-700 inline-flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> You locked these on {new Date(placement.offerLetterTraineeAckAt).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4-way decision */}
        {!traineeAlreadyResponded && mode === 'decide' && (
          <div className="rounded-2xl border border-bdr bg-white p-4">
            <div className="text-[13px] font-bold text-txt-primary">What's your status with this placement?</div>
            <div className="text-[11px] text-txt-secondary mt-1 mb-3">
              Be honest. Your TP cannot see your exact response before NSDC has reviewed. Lying carries stipend-recovery + scheme-debarment consequences for the TP.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button disabled={submitting} onClick={() => submitDecision('yes')}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Yes, I joined this job
              </button>
              <button disabled={submitting} onClick={() => { ackOcr(); submitDecision('yes') }}
                className="py-3 rounded-xl bg-white border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-[13px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <Edit3 className="w-4 h-4" /> Joined, but with edits
              </button>
              <button disabled={submitting} onClick={() => setMode('deny')}
                className="py-3 rounded-xl bg-white border border-danger/40 text-danger hover:bg-danger/5 font-bold text-[13px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <XCircle className="w-4 h-4" /> No, I did NOT join
              </button>
              <button disabled={submitting} onClick={() => setMode('dispute')}
                className="py-3 rounded-xl bg-white border border-amber-500/60 text-amber-700 hover:bg-amber-50 font-bold text-[13px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <Flag className="w-4 h-4" /> Raise a dispute
              </button>
            </div>
            <div className="text-[11px] text-txt-secondary mt-3 leading-relaxed">
              <span className="font-bold text-txt-primary">Yes</span> confirms cleanly · <span className="font-bold text-txt-primary">with edits</span> = you joined but some letter fields are wrong · <span className="font-bold text-txt-primary">No</span> = you never joined · <span className="font-bold text-txt-primary">Dispute</span> = you joined but conditions don't match what was promised.
            </div>
          </div>
        )}

        {/* Deny categories */}
        {!traineeAlreadyResponded && mode === 'deny' && (
          <CategoryPicker
            tone="danger" title="Why did you not join?" subtitle="Pick all that apply. Goes confidentially to NSDC + SSC."
            options={DENY_CATEGORIES} checks={denyChecks} setChecks={setDenyChecks}
            note={note} setNote={setNote}
            onBack={() => { setMode('decide'); setNote('') }}
            onSubmit={() => submitDecision('no')}
            submitting={submitting} submitLabel="Submit rejection"
          />
        )}

        {/* Dispute categories */}
        {!traineeAlreadyResponded && mode === 'dispute' && (
          <CategoryPicker
            tone="amber" title="What's wrong with the placement?" subtitle="You joined, but conditions don't match. Tell us what's off."
            options={DISPUTE_CATEGORIES} checks={disputeChecks} setChecks={setDisputeChecks}
            note={note} setNote={setNote}
            onBack={() => { setMode('decide'); setNote('') }}
            onSubmit={() => submitDecision('dispute')}
            submitting={submitting} submitLabel="Raise grievance"
          />
        )}

        {traineeAlreadyResponded && (
          <div className="rounded-2xl border border-bdr bg-surface-page/40 p-4 text-[13px]">
            {placement.state === 'disputed' ? (
              <div className="inline-flex items-start gap-2 text-amber-700">
                <MessageSquareWarning className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Grievance raised. NSDC + SSC are reviewing. Payment to the TP is on hold until resolved.</span>
              </div>
            ) : placement.state === 'conflicted' ? (
              <div className="inline-flex items-start gap-2 text-danger">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>You said this placement did not happen. It's flagged for NSDC investigation.</span>
              </div>
            ) : (
              <div className="inline-flex items-start gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>You confirmed this placement. Employer confirmation pending — that's how 3-signal verification works.</span>
              </div>
            )}
          </div>
        )}

        {/* Why we ask */}
        <div className="rounded-2xl border border-bdr-light bg-surface-page/40 p-3 text-[11px] text-txt-secondary leading-relaxed inline-flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <b className="text-txt-primary">Why independent?</b> TP, you, and the employer answer separately. None of you can see the others' response before answering. Only when all three agree does the placement become a verified outcome.
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────────────

function LetterThumb({ label, url }) {
  return (
    <div className="rounded-xl border border-bdr-light bg-white p-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">{label}</div>
      <img src={url} alt={label} className="w-full h-32 object-cover rounded-md" />
    </div>
  )
}

function OcrRow({ field, label, icon: Icon, kind, value, editing, onEdit, onSave, onCancel }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => { setDraft(value ?? '') }, [value, editing])
  return (
    <div className="flex items-center gap-2 py-1 border-b border-bdr-light/60 last:border-b-0">
      <Icon className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
      <div className="text-[11px] text-txt-secondary w-28 flex-shrink-0">{label}</div>
      {!editing ? (
        <div className="flex-1 text-[12px] font-medium text-txt-primary truncate">{fmt(value, kind)}</div>
      ) : (
        <input
          autoFocus
          type={kind === 'date' ? 'date' : 'text'}
          value={draft || ''}
          onChange={e => setDraft(kind === 'inr' ? e.target.value.replace(/\D/g, '') : e.target.value)}
          className="flex-1 text-[12px] border border-bdr rounded px-2 py-1"
        />
      )}
      {!editing ? (
        <button onClick={onEdit} className="text-[11px] text-violet-700 inline-flex items-center gap-1 hover:underline">
          <Edit3 className="w-3 h-3" /> Edit
        </button>
      ) : (
        <>
          <button onClick={() => onSave(kind === 'inr' ? Number(draft || 0) : draft)} className="text-[11px] text-emerald-700 inline-flex items-center gap-1 hover:underline">
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={onCancel} className="text-[11px] text-txt-secondary hover:underline">Cancel</button>
        </>
      )}
    </div>
  )
}

function CategoryPicker({ tone, title, subtitle, options, checks, setChecks, note, setNote, onBack, onSubmit, submitting, submitLabel }) {
  const toneClasses = tone === 'amber'
    ? { wrap: 'border-amber-500/40 bg-amber-50/40', title: 'text-amber-800', btn: 'bg-amber-600 hover:bg-amber-700' }
    : { wrap: 'border-danger/40 bg-danger/5',       title: 'text-danger',    btn: 'bg-danger hover:bg-danger/90' }
  return (
    <div className={`rounded-2xl border ${toneClasses.wrap} p-4`}>
      <div className={`text-[13px] font-bold ${toneClasses.title} inline-flex items-center gap-2`}>
        <AlertTriangle className="w-4 h-4" /> {title}
      </div>
      <div className="text-[11px] text-txt-secondary mt-1 mb-3">{subtitle}</div>
      <div className="space-y-1.5 mb-3">
        {options.map(o => (
          <label key={o.key} className="flex items-center gap-2 text-[12px] py-1 cursor-pointer">
            <input type="checkbox" className="accent-current"
              checked={!!checks[o.key]} onChange={e => setChecks({ ...checks, [o.key]: e.target.checked })} />
            <span className="text-txt-primary">{o.label}</span>
          </label>
        ))}
      </div>
      <textarea rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)}
        placeholder="Add details — what happened, when, who you spoke to…"
        className="w-full rounded-xl border border-bdr px-3 py-2 text-[12px] focus:outline-none resize-none" />
      <div className="text-[10px] text-txt-tertiary text-right mt-0.5">{note.length}/500</div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button disabled={submitting} onClick={onBack}
          className="py-2 rounded-pill border border-bdr text-[12px] font-bold text-txt-primary hover:bg-slate-50 disabled:opacity-60">
          Back
        </button>
        <button disabled={submitting} onClick={onSubmit}
          className={`py-2 rounded-pill ${toneClasses.btn} text-white font-bold text-[12px] disabled:opacity-60`}>
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="font-bold text-[13px] text-txt-primary truncate">{value}</div>
    </div>
  )
}

// Backwards-compat export (EmployerConfirmCanvas imports VerificationCard from here)
export function VerificationCard({ placement }) {
  return (
    <div className="rounded-card border border-bdr-light bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-txt-secondary">Placement</div>
          <div className="text-lg font-semibold truncate">{placement.role}</div>
          <div className="text-sm text-txt-secondary flex items-center gap-1 mt-0.5">
            <Building2 className="w-3.5 h-3.5" />{placement.employer?.name}
          </div>
        </div>
        <VerificationBadge state={placement.state} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <Stat icon={IndianRupee} label="Monthly CTC" value={`₹${Number(placement.ctcMonthly || 0).toLocaleString('en-IN')}`} />
        <Stat icon={Calendar} label="Joining" value={placement.joiningDate ? new Date(placement.joiningDate).toLocaleDateString('en-IN') : '—'} />
      </div>
      {placement.conflictReason && (
        <div className="mt-3 text-xs text-danger bg-danger-light rounded-card p-2">Conflict: {placement.conflictReason}</div>
      )}
    </div>
  )
}
