// Trainee's view: "Did you actually join this job?" This is the trainee leg
// of KSK's 3-signal maker-checker — TP declares, trainee confirms, employer
// confirms independently. All three must agree before the placement counts.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { applyCredit } from '../../utils/aiCredits.js'
import {
  CheckCircle2, XCircle, IndianRupee, Calendar, Building2,
  ShieldCheck, AlertTriangle, Briefcase, MapPin, ChevronRight,
} from 'lucide-react'
import VerificationBadge from './_VerificationBadge.jsx'

export default function PlacementConfirmCanvas({ context }) {
  const { showToast, user } = useApp() || {}
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [disputeMode, setDisputeMode] = useState(false)
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

  async function submit(confirmed) {
    if (!placement) return
    setSubmitting(true)
    try {
      const r = await api.traineeConfirmPlc(placement.id, {
        confirmed,
        note: confirmed ? undefined : (note?.trim() || 'I did not join'),
      })
      setPlacement(r.placement); setDisputeMode(false); setNote('')
      // Award AI credits on confirm — once per placement (idempotent via
      // uniqueId so users can't refresh-spam).
      if (confirmed) {
        const next = applyCredit(user?.id, 'approve_placement', { uniqueId: placement.id })
        showToast?.({
          kind: 'success',
          text: `Confirmed. +50 AI credits earned (balance ${next.balance}). Employer confirmation pending.`,
        })
      } else {
        showToast?.({ kind: 'warn', text: 'Disputed. The TP and NSDC have been alerted to investigate.' })
      }
    } catch {
      showToast?.({ kind: 'danger', text: 'Could not submit. Try again.' })
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return <div className="p-6 text-[13px] text-txt-secondary">Loading your pending placements…</div>
  }
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

  const traineeAlreadyResponded = !!placement.traineeConfirmedAt || placement.state === 'disputed'

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-violet-50/70 to-white flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700">Confirm Placement</div>
        <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-1">Did you actually join this job?</h2>
        <p className="text-[12px] text-txt-secondary mt-1">
          Your honest answer is one of three signals used to verify this placement.
        </p>
      </div>

      {/* Big "what's the offer" card */}
      <div className="px-5 py-4 space-y-4">
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

          <div className="mt-4 pt-4 border-t border-bdr-light">
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">3-signal verification</div>
            <div className="space-y-1.5">
              <SignalRow label="Training partner declared"
                who={placement.tp?.name || 'TP'} ts={placement.tpDeclaredAt} status="declared" />
              <SignalRow label="You (trainee) confirm"
                who="You" ts={placement.traineeConfirmedAt}
                status={placement.traineeConfirmedAt ? 'confirmed' : (placement.state === 'disputed' ? 'denied' : 'pending')} />
              <SignalRow label="Employer confirms separately"
                who={placement.employer?.name || 'Employer'} ts={placement.employerConfirmedAt}
                status={placement.employerConfirmedAt ? 'confirmed' : (placement.state === 'conflicted' ? 'denied' : 'pending')} />
            </div>
          </div>

          {placement.conflictReason && (
            <div className="mt-3 rounded-xl bg-danger/5 border border-danger/30 p-3 inline-flex items-start gap-2 text-[12px] text-danger">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><b>Conflict:</b> {placement.conflictReason}</span>
            </div>
          )}
        </div>

        {/* Action zone */}
        {!traineeAlreadyResponded && !disputeMode && (
          <div className="rounded-2xl border border-bdr bg-white p-4">
            <div className="text-[13px] font-bold text-txt-primary">Did you actually join this job?</div>
            <div className="text-[11px] text-txt-secondary mt-1 mb-3">
              Confirm only if you really started working there. Lying carries stipend-recovery + scheme-debarment consequences for the TP.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button disabled={submitting} onClick={() => submit(true)}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Yes, I joined this job
              </button>
              <button disabled={submitting} onClick={() => setDisputeMode(true)}
                className="py-3 rounded-xl bg-white border border-danger/40 text-danger hover:bg-danger/5 font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
                <XCircle className="w-4 h-4" /> No, I did not
              </button>
            </div>
          </div>
        )}

        {!traineeAlreadyResponded && disputeMode && (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
            <div className="text-[13px] font-bold text-danger inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Tell us what happened
            </div>
            <div className="text-[11px] text-txt-secondary mt-1 mb-3">
              This goes confidentially to NSDC + your SSC. Your TP won't see your exact note before NSDC has investigated.
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={3} maxLength={500}
              placeholder="e.g. 'I never interviewed at this employer' / 'I joined but resigned after 2 days' / 'Different employer than what was promised'"
              className="w-full rounded-xl border border-bdr px-3 py-2 text-[13px] focus:border-danger outline-none resize-none" />
            <div className="text-[10px] text-txt-tertiary mt-1 text-right">{note.length}/500</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button disabled={submitting} onClick={() => { setDisputeMode(false); setNote('') }}
                className="py-2 rounded-pill border border-bdr text-[13px] font-bold text-txt-primary hover:bg-slate-50 disabled:opacity-60">
                Back
              </button>
              <button disabled={submitting} onClick={() => submit(false)}
                className="py-2 rounded-pill bg-danger text-white font-bold text-[13px] disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </div>
        )}

        {traineeAlreadyResponded && (
          <div className="rounded-2xl border border-bdr bg-surface-page/40 p-4 text-[13px]">
            {placement.state === 'disputed' ? (
              <div className="inline-flex items-start gap-2 text-danger">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>You said this placement did not happen. It's flagged for NSDC investigation. You'll be notified once it's reviewed.</span>
              </div>
            ) : (
              <div className="inline-flex items-start gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>You confirmed this placement. We're now waiting for the employer to confirm independently — that's how 3-signal verification works.</span>
              </div>
            )}
          </div>
        )}

        {/* Why we ask */}
        <div className="rounded-2xl border border-bdr-light bg-surface-page/40 p-3 text-[11px] text-txt-secondary leading-relaxed inline-flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <b className="text-txt-primary">Why independent?</b> The TP, you, and the employer are all asked separately. None of you can see the others' response before answering. Only when all three agree does the placement become a verified outcome counted by NSDC + funders.
          </span>
        </div>
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

function SignalRow({ label, who, ts, status }) {
  const map = {
    declared:  { dot: 'bg-violet-500', text: 'text-violet-700',   word: 'Declared'  },
    confirmed: { dot: 'bg-emerald-500',text: 'text-emerald-700',  word: 'Confirmed' },
    pending:   { dot: 'bg-slate-300',  text: 'text-txt-tertiary', word: 'Pending'   },
    denied:    { dot: 'bg-danger',     text: 'text-danger',       word: 'Denied'    },
  }[status] || { dot: 'bg-slate-300', text: 'text-txt-tertiary', word: 'Pending' }
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <div className={`w-2 h-2 rounded-full ${map.dot}`} />
      <div className="flex-1 text-txt-primary">{label} · <span className="text-txt-secondary">{who}</span></div>
      <div className={`text-[11px] ${map.text} font-medium`}>{ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short' }) : map.word}</div>
    </div>
  )
}

// Re-export the verification card under its old name so EmployerConfirmCanvas
// (which imports it) keeps working.
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
      <div className="border-t border-bdr-light my-3" />
      <div className="space-y-2">
        <SignalRow label="Training partner declared"  who={placement.tp?.name || 'TP'} ts={placement.tpDeclaredAt} status="declared" />
        <SignalRow label="Trainee confirmed"          who={placement.trainee?.name || 'Trainee'} ts={placement.traineeConfirmedAt} status={placement.traineeConfirmedAt ? 'confirmed' : (placement.state === 'disputed' ? 'denied' : 'pending')} />
        <SignalRow label="Employer confirmed"         who={placement.employer?.name || 'Employer'} ts={placement.employerConfirmedAt} status={placement.employerConfirmedAt ? 'confirmed' : (placement.state === 'conflicted' ? 'denied' : 'pending')} />
      </div>
      {placement.conflictReason && (
        <div className="mt-3 text-xs text-danger bg-danger-light rounded-card p-2">Conflict: {placement.conflictReason}</div>
      )}
    </div>
  )
}
