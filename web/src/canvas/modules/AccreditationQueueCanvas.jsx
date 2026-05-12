import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'

export default function AccreditationQueueCanvas() {
  const { showToast } = useApp()
  const [pending, setPending] = useState([])
  useEffect(() => { api.get('/api/accreditation/queue').then(r => setPending(r.pending || [])) }, [])

  async function decide(id, decision) {
    try {
      await api.post(`/api/accreditation/${id}/decide`, { decision })
      showToast({ kind: 'success', text: `Marked ${decision}.` })
      api.get('/api/accreditation/queue').then(r => setPending(r.pending || []))
    } catch { showToast({ kind: 'danger', text: 'Failed.' }) }
  }

  return (
    <div className="p-5 space-y-3">
      <h3 className="text-sm font-semibold">Pending TP/TC accreditation applications</h3>
      {pending.length === 0 && <div className="text-sm text-txt-secondary">No pending applications.</div>}
      {pending.map(tp => (
        <div key={tp.id} className="rounded-card border border-bdr-light bg-white p-3">
          <div className="text-sm font-medium">{tp.name} ({tp.code})</div>
          <div className="text-xs text-txt-secondary">{tp.type} · {tp.centres?.length || 0} centres</div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => decide(tp.id, 'accredited')} className="flex-1 py-1.5 text-xs rounded bg-ok text-white">Accredit</button>
            <button onClick={() => decide(tp.id, 'revoked')} className="flex-1 py-1.5 text-xs rounded bg-danger text-white">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}
