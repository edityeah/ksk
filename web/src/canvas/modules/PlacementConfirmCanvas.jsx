// Trainee's view: "Did you actually join this job?"  This is the trainee leg of the
// 3-signal maker-checker.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { CheckCircle2, XCircle, IndianRupee, Calendar, Building2 } from 'lucide-react'
import VerificationBadge from './_VerificationBadge.jsx'

export default function PlacementConfirmCanvas({ context }) {
  const { showToast, closeCanvas } = useApp()
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')

  async function load() {
    setLoading(true)
    try {
      if (context.placementId) {
        const r = await api.placement(context.placementId)
        setPlacement(r.placement)
      } else {
        // first placement awaiting trainee confirm
        const list = await api.placements()
        const target = (list.placements || []).find(p => !p.traineeConfirmedAt && p.state === 'claimed_unverified')
        setPlacement(target || list.placements?.[0] || null)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [context.placementId])

  async function submit(confirmed) {
    if (!placement) return
    setSubmitting(true)
    try {
      const r = await api.traineeConfirmPlc(placement.id, { confirmed, note: confirmed ? undefined : (note || 'I did not join') })
      setPlacement(r.placement)
      showToast({ kind: confirmed ? 'success' : 'warn', text: confirmed ? 'Confirmed — payment clock starts when employer agrees.' : 'Disputed — flagged for review.' })
    } catch { showToast({ kind: 'danger', text: 'Could not submit.' }) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>
  if (!placement) return <div className="p-6 text-sm text-txt-secondary">No placement awaiting your confirmation.</div>

  return (
    <div className="p-5 space-y-4">
      <VerificationCard placement={placement} role="trainee" />

      <div className="rounded-card border border-bdr-light p-4 bg-white">
        <div className="text-sm font-medium mb-1">Your training partner says you joined this employer.</div>
        <div className="text-xs text-txt-secondary mb-3">Confirm only if true — your confirmation is one of three independent signals used to verify this placement.</div>

        {!placement.traineeConfirmedAt && placement.state !== 'disputed' ? (
          <div className="flex gap-2">
            <button disabled={submitting} onClick={() => submit(true)}
              className="flex-1 py-2.5 rounded-card bg-ok text-white font-medium hover:bg-ok/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Yes, I joined
            </button>
            <button disabled={submitting} onClick={() => submit(false)}
              className="flex-1 py-2.5 rounded-card bg-danger text-white font-medium hover:bg-danger/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> No, I did not
            </button>
          </div>
        ) : placement.state === 'disputed' ? (
          <div className="text-sm text-danger font-medium">You said this placement did not happen. Marked as disputed.</div>
        ) : (
          <div className="text-sm text-ok font-medium inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> You've confirmed this placement.</div>
        )}
      </div>

      <div className="text-[11px] text-txt-tertiary px-1">
        Independent verification means we ask all three parties separately. You cannot see what the employer said before you respond — and the employer cannot see what you said. That's the design.
      </div>
    </div>
  )
}

// Reusable verification card — used by both trainee and employer canvases.
export function VerificationCard({ placement, role }) {
  return (
    <div className="rounded-card border border-bdr-light bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-txt-secondary">Placement</div>
          <div className="text-lg font-semibold truncate">{placement.role}</div>
          <div className="text-sm text-txt-secondary flex items-center gap-1 mt-0.5"><Building2 className="w-3.5 h-3.5" />{placement.employer?.name}</div>
        </div>
        <VerificationBadge state={placement.state} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div>
          <div className="text-xs text-txt-secondary">Monthly CTC</div>
          <div className="font-medium inline-flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-txt-tertiary" />{placement.ctcMonthly?.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="text-xs text-txt-secondary">Joining</div>
          <div className="font-medium inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-txt-tertiary" />{new Date(placement.joiningDate).toLocaleDateString()}</div>
        </div>
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

function SignalRow({ label, who, ts, status }) {
  const map = {
    declared:  { dot: 'bg-primary', text: 'text-primary-dark', word: 'Declared' },
    confirmed: { dot: 'bg-ok',          text: 'text-ok',          word: 'Confirmed' },
    pending:   { dot: 'bg-slate-300',   text: 'text-txt-tertiary',word: 'Pending' },
    denied:    { dot: 'bg-danger',      text: 'text-danger',      word: 'Denied' },
  }[status] || { dot: 'bg-slate-300', text: 'text-txt-tertiary', word: 'Pending' }
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${map.dot}`} />
      <div className="flex-1">{label} · <span className="text-txt-secondary">{who}</span></div>
      <div className={`text-xs ${map.text}`}>{ts ? new Date(ts).toLocaleString() : map.word}</div>
    </div>
  )
}
