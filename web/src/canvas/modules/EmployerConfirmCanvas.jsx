// Employer's view: "Did you actually hire this person?"

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import { CheckCircle2, XCircle } from 'lucide-react'
import { VerificationCard } from './PlacementConfirmCanvas.jsx'

export default function EmployerConfirmCanvas({ context }) {
  const { showToast } = useApp()
  const [placement, setPlacement] = useState(null)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [correctedCtc, setCorrectedCtc] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await api.placements()
      const all = r.placements || []
      setList(all)
      const initial = context.placementId
        ? all.find(p => p.id === context.placementId)
        : all.find(p => !p.employerConfirmedAt && p.state !== 'verified' && p.state !== 'disputed')
      setPlacement(initial || all[0] || null)
      setCorrectedCtc(String(initial?.ctcMonthly || ''))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [context.placementId])

  async function submit(confirmed) {
    if (!placement) return
    setSubmitting(true)
    try {
      const r = await api.employerConfirmPlc(placement.id, {
        confirmed,
        correctedCtc: confirmed && Number(correctedCtc) ? Number(correctedCtc) : undefined,
        note: confirmed ? undefined : (note || 'Employer denied'),
      })
      setPlacement(r.placement)
      showToast({ kind: confirmed ? 'success' : 'warn', text: confirmed ? 'Confirmed.' : 'Flagged as conflicted.' })
    } catch { showToast({ kind: 'danger', text: 'Could not submit.' }) }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>
  if (!placement) return <div className="p-6 text-sm text-txt-secondary">No pending confirmations.</div>

  return (
    <div className="p-5 space-y-4">
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map(p => (
            <button key={p.id} onClick={() => { setPlacement(p); setCorrectedCtc(String(p.ctcMonthly)) }}
              className={`px-3 py-1.5 text-xs rounded-pill whitespace-nowrap border ${placement.id === p.id ? 'border-primary bg-primary-light text-primary-dark' : 'border-bdr-light bg-white'}`}>
              {p.trainee?.name} · {p.state.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      <VerificationCard placement={placement} role="employer" />

      <div className="rounded-card border border-bdr-light p-4 bg-white">
        <div className="text-sm font-medium mb-1">Did you hire <b>{placement.trainee?.name}</b>?</div>
        <div className="text-xs text-txt-secondary mb-3">Your confirmation is independent — the training partner cannot see it before you submit. We never reveal what the trainee said.</div>

        {!placement.employerConfirmedAt && placement.state !== 'conflicted' ? (
          <>
            <label className="block text-xs font-medium text-txt-secondary mt-1 mb-1">Confirm monthly CTC (₹)</label>
            <input value={correctedCtc} onChange={e => setCorrectedCtc(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-full px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary mb-3" />
            <div className="flex gap-2">
              <button disabled={submitting} onClick={() => submit(true)}
                className="flex-1 py-2.5 rounded-card bg-ok text-white font-medium hover:bg-ok/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Yes, hired
              </button>
              <button disabled={submitting} onClick={() => submit(false)}
                className="flex-1 py-2.5 rounded-card bg-danger text-white font-medium hover:bg-danger/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> No
              </button>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (if denying)"
              className="w-full mt-3 px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary text-sm" rows={2} />
          </>
        ) : placement.state === 'conflicted' ? (
          <div className="text-sm text-danger font-medium">You denied this placement. Marked as conflicted.</div>
        ) : (
          <div className="text-sm text-ok font-medium inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> You've confirmed this hire.</div>
        )}
      </div>
    </div>
  )
}
