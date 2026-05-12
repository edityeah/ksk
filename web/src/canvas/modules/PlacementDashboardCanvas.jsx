import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function PlacementDashboardCanvas() {
  const [funnel, setFunnel] = useState([])
  const [placements, setPlacements] = useState([])
  useEffect(() => {
    api.placementFunnel().then(r => setFunnel(r.funnel || []))
    api.placements().then(r => setPlacements(r.placements || []))
  }, [])

  const stateCounts = placements.reduce((acc, p) => { acc[p.state] = (acc[p.state] || 0) + 1; return acc }, {})

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {['claimed_unverified', 'partially_verified', 'verified', 'conflicted', 'disputed'].map(s => (
          <div key={s} className="rounded-card border border-bdr-light bg-white p-3">
            <div className="text-[11px] uppercase tracking-wider text-txt-secondary">{s.replace('_', ' ')}</div>
            <div className="text-2xl font-semibold mt-1">{stateCounts[s] || 0}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">3-signal verification funnel</h3>
        <div className="space-y-2">
          {funnel.map(f => (
            <div key={f.stage} className="rounded-card border border-bdr-light bg-white p-3">
              <div className="flex items-center justify-between"><div className="text-sm font-medium">{f.stage}</div><div className="text-sm font-mono">{f.count}</div></div>
              <div className="mt-1.5 h-1.5 rounded-pill bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary-500" style={{ width: `${Math.min(100, (f.count / Math.max(funnel[0]?.count || 1, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Recent placement claims</h3>
        <div className="rounded-card border border-bdr-light bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-txt-secondary">
              <tr><th className="text-left px-3 py-2">Trainee</th><th className="text-left px-3 py-2">Employer</th><th className="text-right px-3 py-2">CTC</th><th className="text-right px-3 py-2">State</th></tr>
            </thead>
            <tbody>
              {placements.slice(0, 20).map(p => (
                <tr key={p.id} className="border-t border-bdr-light">
                  <td className="px-3 py-2">{p.trainee?.name}</td>
                  <td className="px-3 py-2 text-txt-secondary">{p.employer?.name}</td>
                  <td className="px-3 py-2 text-right">₹{p.ctcMonthly?.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right text-xs">{p.state.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
