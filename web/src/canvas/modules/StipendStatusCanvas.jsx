import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function StipendStatusCanvas() {
  const [list, setList] = useState([])
  useEffect(() => { api.get('/api/stipends/mine').then(r => setList(r.stipends || [])) }, [])
  return (
    <div className="p-5 space-y-2">
      <h3 className="text-sm font-semibold">My stipend history</h3>
      {list.map(s => (
        <div key={s.id} className="rounded-card border border-bdr-light bg-white p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{s.scheme?.code} · {s.month}</div>
            <div className="text-xs text-txt-secondary">{s.disbursalState}{s.utr ? ` · UTR ${s.utr}` : ''}{s.failureReason ? ` · ${s.failureReason}` : ''}</div>
          </div>
          <div className="text-base font-semibold">₹{s.amount}</div>
        </div>
      ))}
      {list.length === 0 && <div className="text-sm text-txt-secondary">No stipends recorded.</div>}
    </div>
  )
}
