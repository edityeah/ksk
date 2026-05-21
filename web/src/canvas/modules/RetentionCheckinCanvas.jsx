// Monthly retention check-ins for 12 months post-placement.
//
// Roles diverge here:
//   - training_centre  : owns months 1-3. Must upload monthly salary slip
//                        + mark employed / not.
//   - trainee          : confirms every month. Months 1-3 trainee waits for
//                        TC to act first then confirms with evidence (selfie,
//                        ID card, pay stub). Months 4-12 trainee leads.
//                        Can EPFO-link UAN for auto-verification.
//   - employer         : optional legacy confirmation (month 3 default).
//
// EPFO link doesn't replace the trainee signal — it adds a third confirmation
// channel that lifts state to `epfo_verified` even if the human leg is slow.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import VerificationBadge from './_VerificationBadge.jsx'
import { readFileAsDataUrl, ACCEPT_LETTER } from '../../utils/fileUpload.js'
import FilePreview from '../../components/FilePreview.jsx'
import {
  CheckCircle2, XCircle, Upload, Loader2, ShieldCheck, FileText,
  Image as ImageIcon, AlertTriangle, Calendar, IndianRupee, Building2,
  Link2, Sparkles, RefreshCw,
} from 'lucide-react'

export default function RetentionCheckinCanvas() {
  const { role, showToast } = useApp()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [epfo, setEpfo] = useState({ linked: false })

  async function load() {
    setLoading(true)
    try {
      const r = await api.retentionDue()
      setCheckins(r.checkins || [])
      if (role === 'trainee') {
        try { setEpfo(await api.epfoStatus()) } catch {}
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [role])

  if (loading) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-violet-50/70 to-white">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700">Retention</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">
          {role === 'training_centre' ? 'Months 1–3 retention check-ins' : 'Are you still employed?'}
        </h2>
        <p className="text-[12px] text-txt-secondary mt-1">
          {role === 'training_centre'
            ? 'For each placed trainee, upload a monthly salary slip and confirm whether they\'re still working. Trainee will confirm independently.'
            : role === 'trainee'
              ? 'Each month after joining we check in. Confirm honestly — your TP\'s outcome payment depends on it.'
              : 'Confirm whether the hire is still with you.'}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {role === 'trainee' && <EpfoBanner status={epfo} onChange={setEpfo} />}

        {checkins.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-6 text-center text-[13px] text-txt-secondary">
            Nothing due right now. You'll see the next check-in here when it opens.
          </div>
        )}

        {checkins.map(c => (
          <CheckinCard key={c.id} checkin={c} role={role} epfo={epfo} reload={load} showToast={showToast} />
        ))}
      </div>
    </div>
  )
}

// ── EPFO linking banner ─────────────────────────────────────────────────────
function EpfoBanner({ status, onChange }) {
  const { showToast } = useApp()
  const [uan, setUan] = useState('')
  const [busy, setBusy] = useState(false)

  async function link() {
    if (!/^\d{12}$/.test(uan)) { showToast({ kind: 'warn', text: 'UAN must be 12 digits.' }); return }
    setBusy(true)
    try {
      const r = await api.epfoLink(uan)
      onChange(await api.epfoStatus())
      showToast({ kind: 'success', text: 'EPFO linked. We\'ll auto-verify your employment monthly.' })
    } catch (e) {
      showToast({ kind: 'danger', text: 'Could not link UAN.' })
    } finally { setBusy(false) }
  }

  async function unlink() {
    setBusy(true)
    try { await api.epfoUnlink(); onChange(await api.epfoStatus()) }
    finally { setBusy(false) }
  }

  if (status.linked) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-50/40 p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <div className="flex-1">
            <div className="text-[13px] font-bold text-emerald-800">EPFO linked · {status.uan}</div>
            <div className="text-[11px] text-emerald-700">
              Last employer on record: <b>{status.employerName || 'updating…'}</b>. We auto-verify employment monthly.
            </div>
          </div>
          <button disabled={busy} onClick={unlink} className="text-[11px] text-emerald-800 underline disabled:opacity-50">Unlink</button>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-50/40 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-violet-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-[13px] font-bold text-violet-800">Link your EPFO / UAN — skip manual check-ins</div>
          <div className="text-[11px] text-txt-secondary">
            Your 12-digit Universal Account Number from your salary slip / PF passbook. KSK matches your employer monthly so you don't have to.
          </div>
          <div className="mt-2 flex gap-2">
            <input value={uan} onChange={e => setUan(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="123412341234"
              className="flex-1 px-3 py-2 rounded-pill border border-bdr text-[13px] tracking-widest" />
            <button disabled={busy} onClick={link}
              className="px-3 py-2 rounded-pill bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold inline-flex items-center gap-1 disabled:opacity-60">
              <Link2 className="w-3.5 h-3.5" /> Link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-checkin card ────────────────────────────────────────────────────────
function CheckinCard({ checkin: c, role, epfo, reload, showToast }) {
  const [busy, setBusy] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState(null)
  const [slipUrl, setSlipUrl] = useState(null)
  const [tcStatus, setTcStatus] = useState('employed')
  const [slipMonth, setSlipMonth] = useState(new Date().toISOString().slice(0, 7))
  const [note, setNote] = useState('')
  const [epfoBusy, setEpfoBusy] = useState(false)
  const [epfoResult, setEpfoResult] = useState(null)

  const isTcOwned = c.ownerRole === 'training_centre' || c.milestone <= 3
  const placement = c.placement
  const employerName = placement?.employer?.name || placement?.trainee?.name || 'this hire'

  async function uploadEvidence(file) {
    try { setEvidenceUrl(await readFileAsDataUrl(file)) } catch (e) { showToast({ kind: 'danger', text: e.message }) }
  }
  async function uploadSlip(file) {
    try { setSlipUrl(await readFileAsDataUrl(file)) } catch (e) { showToast({ kind: 'danger', text: e.message }) }
  }

  async function traineeRespond(status) {
    if (status === 'employed' && !evidenceUrl && !c.traineeEvidenceUrl) {
      showToast({ kind: 'warn', text: 'Upload evidence — pay stub, ID card photo, or selfie at workplace.' }); return
    }
    setBusy(true)
    try {
      await api.retentionTraineeRespond(c.id, { status, note, evidenceUrl })
      showToast({ kind: 'success', text: 'Response recorded.' })
      reload()
    } catch { showToast({ kind: 'danger', text: 'Could not submit.' }) }
    finally { setBusy(false) }
  }

  async function tcRespond() {
    if (tcStatus === 'employed' && !slipUrl) {
      showToast({ kind: 'warn', text: 'A salary slip is required when marking the trainee as employed.' }); return
    }
    setBusy(true)
    try {
      await api.retentionTcRespond(c.id, {
        status: tcStatus,
        salarySlipUrl: slipUrl || undefined,
        salarySlipMonth: slipMonth,
        note,
      })
      showToast({ kind: 'success', text: 'Updated. Trainee will be nudged to confirm.' })
      reload()
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error || 'Could not submit.' })
    }
    finally { setBusy(false) }
  }

  async function employerRespond(status) {
    setBusy(true)
    try {
      await api.retentionEmployerRespond(c.id, { status, note })
      reload()
    } finally { setBusy(false) }
  }

  async function runEpfo() {
    setEpfoBusy(true); setEpfoResult(null)
    try {
      const r = await api.epfoVerify({ retentionCheckinId: c.id })
      setEpfoResult(r)
      if (r.verified) showToast({ kind: 'success', text: 'EPFO verified you\'re still employed there.' })
      else showToast({ kind: 'warn', text: 'EPFO did not match this employer.' })
      reload()
    } catch { showToast({ kind: 'danger', text: 'EPFO check failed.' }) }
    finally { setEpfoBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-bdr bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-txt-tertiary">
            Month {c.milestone} · {isTcOwned ? 'TC-owned' : 'Trainee-led'}
          </div>
          <div className="text-[15px] font-bold text-txt-primary inline-flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-violet-600" /> {employerName}
          </div>
          <div className="text-[11px] text-txt-secondary">
            Due {new Date(c.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {placement?.role ? ` · ${placement.role}` : ''}
          </div>
        </div>
        <VerificationBadge state={c.state} />
      </div>

      {/* Existing signals summary */}
      <div className="rounded-xl border border-bdr-light bg-surface-page/40 p-2 space-y-1 text-[11px]">
        <SignalLine label="TC" status={c.tcStatus} at={c.tcRespondedAt} hasSlip={!!c.tcSalarySlipUrl} />
        <SignalLine label="Trainee" status={c.traineeStatus} at={c.traineeRespondedAt} hasEvidence={!!c.traineeEvidenceUrl} />
        {c.epfoVerified && (
          <div className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <ShieldCheck className="w-3 h-3" /> EPFO verified — {c.epfoEmployerName}
          </div>
        )}
      </div>

      {/* TC action panel */}
      {role === 'training_centre' && !c.tcRespondedAt && isTcOwned && (
        <div className="space-y-2 pt-2 border-t border-bdr-light">
          <div className="text-[12px] font-bold text-txt-primary">Your update for this month</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-txt-secondary">Status
              <select value={tcStatus} onChange={e => setTcStatus(e.target.value)} className="mt-0.5 w-full border border-bdr-light rounded px-2 py-1.5 text-[12px]">
                <option value="employed">Still employed</option>
                <option value="not_employed">Not employed</option>
              </select>
            </label>
            <label className="text-[11px] text-txt-secondary">Slip month
              <input type="month" value={slipMonth} onChange={e => setSlipMonth(e.target.value)} className="mt-0.5 w-full border border-bdr-light rounded px-2 py-1.5 text-[12px]" />
            </label>
          </div>
          <SlipUpload url={slipUrl} onPick={uploadSlip} label="Upload salary slip" />
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Notes (optional)"
            className="w-full rounded-xl border border-bdr px-3 py-2 text-[12px] resize-none" />
          <button disabled={busy} onClick={tcRespond}
            className="w-full py-2 rounded-pill bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-bold disabled:opacity-60">
            {busy ? 'Saving…' : 'Submit month\'s update'}
          </button>
        </div>
      )}

      {/* Trainee action panel */}
      {role === 'trainee' && !c.traineeRespondedAt && (
        <div className="space-y-2 pt-2 border-t border-bdr-light">
          {epfo.linked && (
            <button onClick={runEpfo} disabled={epfoBusy}
              className="w-full py-2 rounded-pill border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-[12px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
              {epfoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Auto-verify via EPFO
            </button>
          )}
          {epfoResult && (
            <div className={`text-[11px] inline-flex items-center gap-1 ${epfoResult.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {epfoResult.verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {epfoResult.verified
                ? `EPFO snapshot matches — ${epfoResult.snapshot?.currentEmployer}`
                : `EPFO last shows ${epfoResult.snapshot?.currentEmployer || '—'}`}
            </div>
          )}

          <EvidenceUpload url={evidenceUrl || c.traineeEvidenceUrl} onPick={uploadEvidence} />
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a note (optional)"
            className="w-full rounded-xl border border-bdr px-3 py-2 text-[12px] resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => traineeRespond('employed')}
              className="py-2.5 rounded-pill bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
              <CheckCircle2 className="w-4 h-4" /> Yes, still working
            </button>
            <button disabled={busy} onClick={() => traineeRespond('not_employed')}
              className="py-2.5 rounded-pill bg-white border border-danger/40 text-danger hover:bg-danger/5 text-[12px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
              <XCircle className="w-4 h-4" /> Not anymore
            </button>
          </div>
        </div>
      )}

      {/* Employer legacy action */}
      {role === 'employer' && !c.employerRespondedAt && (
        <div className="pt-2 border-t border-bdr-light grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => employerRespond('employed')}
            className="py-2 rounded-pill bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
            <CheckCircle2 className="w-4 h-4" /> Still employed
          </button>
          <button disabled={busy} onClick={() => employerRespond('not_employed')}
            className="py-2 rounded-pill bg-white border border-danger/40 text-danger hover:bg-danger/5 text-[12px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-60">
            <XCircle className="w-4 h-4" /> Not employed
          </button>
        </div>
      )}
    </div>
  )
}

function SignalLine({ label, status, at, hasSlip, hasEvidence }) {
  if (!at && !status) {
    return <div className="text-txt-secondary">{label}: waiting</div>
  }
  const ok = status === 'employed'
  return (
    <div className={`inline-flex items-center gap-1 ${ok ? 'text-emerald-700' : 'text-danger'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      <span className="font-medium">{label}: {status}</span>
      {hasSlip && <span className="text-txt-secondary">· slip ✓</span>}
      {hasEvidence && <span className="text-txt-secondary">· evidence ✓</span>}
      {at && <span className="text-txt-tertiary">· {new Date(at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
    </div>
  )
}

function SlipUpload({ url, onPick, label }) {
  if (url) {
    return (
      <div className="rounded-xl border border-bdr-light bg-surface-page/40 p-2 flex items-center gap-2">
        <FilePreview url={url} alt="slip" size="sm" />
        <div className="flex-1 text-[11px] text-emerald-700 font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Salary slip attached
        </div>
        <label className="text-[11px] text-violet-700 cursor-pointer inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Replace
          <input type="file" accept={ACCEPT_LETTER} className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      </div>
    )
  }
  return (
    <label className="block">
      <div className="rounded-xl border-2 border-dashed border-bdr p-3 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30">
        <FileText className="w-5 h-5 text-violet-600 mx-auto mb-0.5" />
        <div className="text-[12px] font-bold">{label}</div>
        <div className="text-[10px] text-txt-secondary">JPG / PNG photo of the slip</div>
      </div>
      <input type="file" accept={ACCEPT_LETTER} className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  )
}

function EvidenceUpload({ url, onPick }) {
  if (url) {
    return (
      <div className="rounded-xl border border-bdr-light bg-surface-page/40 p-2 flex items-center gap-2">
        <FilePreview url={url} alt="evidence" size="sm" />
        <div className="flex-1 text-[11px] text-emerald-700 font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Evidence attached
        </div>
        <label className="text-[11px] text-violet-700 cursor-pointer inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Replace
          <input type="file" accept={ACCEPT_LETTER} className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      </div>
    )
  }
  return (
    <label className="block">
      <div className="rounded-xl border-2 border-dashed border-bdr p-3 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30">
        <ImageIcon className="w-5 h-5 text-violet-600 mx-auto mb-0.5" />
        <div className="text-[12px] font-bold">Upload evidence</div>
        <div className="text-[10px] text-txt-secondary">Pay stub, ID card photo, or selfie at workplace</div>
      </div>
      <input type="file" accept={ACCEPT_LETTER} className="hidden" onChange={e => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  )
}
