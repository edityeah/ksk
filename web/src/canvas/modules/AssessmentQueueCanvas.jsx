import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'

export default function AssessmentQueueCanvas() {
  const { showToast } = useApp()
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(false)

  async function load() {
    const r = await api.get('/api/assessments/queue')
    setList(r.assessments || [])
  }
  useEffect(() => { load() }, [])

  async function submit(id, result) {
    setBusy(true)
    try {
      await api.post(`/api/assessments/${id}/submit`, { result, score: result === 'pass' ? 75 : 40, modality: 'mixed', evidence: [] })
      showToast({ kind: 'success', text: 'Result submitted — trainee notified to acknowledge.' })
      load()
    } catch { showToast({ kind: 'danger', text: 'Failed to submit.' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="p-5 space-y-3">
      <h3 className="text-sm font-semibold">Assessments assigned to you</h3>
      {list.length === 0 && <div className="text-sm text-txt-secondary">No pending assessments.</div>}
      {list.map(a => (
        <div key={a.id} className="rounded-card border border-bdr-light bg-white p-3">
          <div className="text-sm font-medium">{a.trainee?.name}</div>
          <div className="text-xs text-txt-secondary">{a.jobRole?.qpCode} · {a.jobRole?.name} · Scheduled {new Date(a.scheduledAt).toLocaleDateString()}</div>
          {a.state === 'scheduled' && (
            <div className="mt-2 flex gap-2">
              <button disabled={busy} onClick={() => submit(a.id, 'pass')} className="flex-1 py-1.5 text-xs rounded bg-ok text-white">Mark Pass</button>
              <button disabled={busy} onClick={() => submit(a.id, 'fail')} className="flex-1 py-1.5 text-xs rounded bg-danger text-white">Mark Fail</button>
              <button disabled={busy} onClick={() => submit(a.id, 'reattempt')} className="flex-1 py-1.5 text-xs rounded bg-warn text-white">Reattempt</button>
            </div>
          )}
          {a.state === 'conducted' && <div className="mt-1 text-xs text-txt-secondary">Awaiting trainee acknowledgement.</div>}
        </div>
      ))}
    </div>
  )
}
