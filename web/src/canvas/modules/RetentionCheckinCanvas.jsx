import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import VerificationBadge from './_VerificationBadge.jsx'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function RetentionCheckinCanvas() {
  const { role, showToast } = useApp()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await api.retentionDue()
      setCheckins(r.checkins || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function respond(id, status, note) {
    try {
      if (role === 'trainee') await api.retentionTraineeRespond(id, { status, note })
      else                    await api.retentionEmployerRespond(id, { status, note })
      showToast({ kind: 'success', text: 'Response recorded.' })
      load()
    } catch { showToast({ kind: 'danger', text: 'Could not submit.' }) }
  }

  if (loading) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>

  return (
    <div className="p-5 space-y-4">
      <div className="text-sm">
        <h3 className="text-base font-semibold">Retention check-ins {role === 'trainee' ? '· yours' : '· hires you confirmed'}</h3>
        <p className="text-xs text-txt-secondary mt-1">
          At day 30/60/90 after joining, KSK asks {role === 'trainee' ? 'you' : 'you and the trainee separately'} whether the placement is still active. Both signals must agree for retention to be marked verified.
        </p>
      </div>
      {checkins.length === 0 && <div className="rounded-card border border-bdr-light bg-white p-4 text-sm text-txt-secondary">Nothing due right now.</div>}
      {checkins.map(c => (
        <div key={c.id} className="rounded-card border border-bdr-light bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{c.placement?.employer?.name || c.placement?.trainee?.name}</div>
              <div className="text-xs text-txt-secondary">Day {c.milestone} check-in · due {new Date(c.dueAt).toLocaleDateString()}</div>
            </div>
            <VerificationBadge state={c.state} />
          </div>
          {role === 'trainee' && !c.traineeRespondedAt && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => respond(c.id, 'employed')} className="flex-1 py-2 rounded bg-ok text-white text-sm font-medium inline-flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Yes, still working</button>
              <button onClick={() => respond(c.id, 'not_employed')} className="flex-1 py-2 rounded bg-danger text-white text-sm font-medium inline-flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Not anymore</button>
            </div>
          )}
          {role === 'employer' && !c.employerRespondedAt && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => respond(c.id, 'employed')} className="flex-1 py-2 rounded bg-ok text-white text-sm font-medium inline-flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Still employed</button>
              <button onClick={() => respond(c.id, 'not_employed')} className="flex-1 py-2 rounded bg-danger text-white text-sm font-medium inline-flex items-center justify-center gap-1"><XCircle className="w-4 h-4" /> Not employed</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
