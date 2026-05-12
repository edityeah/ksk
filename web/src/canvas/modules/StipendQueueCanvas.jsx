import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'

export default function StipendQueueCanvas() {
  const { showToast } = useApp()
  const [filter, setFilter] = useState('all')
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(false)

  async function load() {
    const r = await api.get(`/api/stipends/queue?filter=${filter}`)
    setList(r.stipends || [])
  }
  useEffect(() => { load() }, [filter])

  async function retry(id) {
    setBusy(true)
    try { await api.post(`/api/stipends/${id}/retry`); showToast({ kind: 'success', text: 'Retry attempted.' }); load() }
    catch { showToast({ kind: 'danger', text: 'Retry failed.' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex gap-2">
        {['all', 'pending', 'failed', 'success'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-pill ${filter === f ? 'bg-primary-500 text-white' : 'bg-slate-100 text-txt-secondary'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="rounded-card border border-bdr-light bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-txt-secondary">
            <tr><th className="text-left px-3 py-2">Trainee</th><th className="text-left px-3 py-2">Scheme</th><th className="text-right px-3 py-2">Amount</th><th className="text-right px-3 py-2">State</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-t border-bdr-light">
                <td className="px-3 py-2">{s.trainee?.name}</td>
                <td className="px-3 py-2 text-xs text-txt-secondary">{s.scheme?.code} · {s.month}</td>
                <td className="px-3 py-2 text-right">₹{s.amount}</td>
                <td className="px-3 py-2 text-right text-xs">{s.disbursalState}{s.failureReason ? <span className="block text-danger">{s.failureReason}</span> : null}</td>
                <td className="px-3 py-2 text-right">
                  {s.disbursalState === 'failed' && <button disabled={busy} onClick={() => retry(s.id)} className="text-xs px-2 py-1 rounded bg-primary-500 text-white">Retry</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-txt-secondary">Empty.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
