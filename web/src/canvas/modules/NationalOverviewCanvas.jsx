// NSDC officer's command-centre overview.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function NationalOverviewCanvas() {
  const [kpis, setKpis] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [funnel, setFunnel] = useState([])

  useEffect(() => {
    api.nationalOverview().then(r => setKpis(r.kpis))
    api.stateLeaderboard().then(r => setLeaderboard(r.rows || []))
    api.placementFunnel().then(r => setFunnel(r.funnel || []))
  }, [])

  if (!kpis) return <div className="p-6 text-sm text-txt-secondary">Loading…</div>

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi label="Enrolled" value={kpis.totalEnrolled?.toLocaleString('en-IN')} />
        <Kpi label="Certified" value={kpis.totalCertified?.toLocaleString('en-IN')} sub={`${kpis.certificationRate}%`} />
        <Kpi label="Placements declared" value={kpis.totalPlacements?.toLocaleString('en-IN')} />
        <Kpi label="Verified placements" value={kpis.verifiedPlacements?.toLocaleString('en-IN')} sub={`${kpis.verifiedRate}% of declared`} tone="ok" />
        <Kpi label="Verified 90-day retention" value={kpis.retention90Verified?.toLocaleString('en-IN')} tone="ok" />
        <Kpi label="Active batches" value={kpis.activeBatches?.toLocaleString('en-IN')} />
      </div>

      <Section title="The gap between declared and verified">
        <div className="space-y-2">
          {funnel.map(f => (
            <div key={f.stage} className="rounded-card border border-bdr-light bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{f.stage}</div>
                <div className="text-sm font-mono">{f.count?.toLocaleString('en-IN')}</div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-pill bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (f.count / Math.max(funnel[0]?.count || 1, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-txt-secondary mt-2">The drop between "Declared" and "Verified" is exactly the discordance Cohorts 1-4 of the Skill Impact Bond surfaced via phone surveys. KSK detects it in real time.</p>
      </Section>

      <Section title="State leaderboard (verified rate)">
        <div className="rounded-card border border-bdr-light bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-txt-secondary">
              <tr><th className="text-left px-3 py-2">State</th><th className="text-right px-3 py-2">Enrolled</th><th className="text-right px-3 py-2">Verified placements</th><th className="text-right px-3 py-2">Verified rate</th></tr>
            </thead>
            <tbody>
              {leaderboard.map(r => (
                <tr key={r.state} className="border-t border-bdr-light">
                  <td className="px-3 py-2 font-medium">{r.state}</td>
                  <td className="px-3 py-2 text-right">{r.enrolled}</td>
                  <td className="px-3 py-2 text-right">{r.verifiedPlacements}</td>
                  <td className="px-3 py-2 text-right"><span className={`badge ${r.verifiedRate >= 30 ? 'badge-ok' : 'badge-warn'}`}>{r.verifiedRate}%</span></td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-txt-secondary">No data.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rounded-card border border-bdr-light bg-white p-3">
      <div className="text-[11px] uppercase tracking-wider text-txt-secondary">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${tone === 'ok' ? 'text-ok' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-txt-secondary mt-0.5">{sub}</div>}
    </div>
  )
}
function Section({ title, children }) {
  return <div><h3 className="text-sm font-semibold mb-2">{title}</h3>{children}</div>
}
