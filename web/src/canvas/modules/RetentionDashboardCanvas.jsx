import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function RetentionDashboardCanvas() {
  const [milestones, setMilestones] = useState([])
  useEffect(() => { api.retentionCohorts().then(r => setMilestones(r.milestones || [])) }, [])

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-sm font-semibold">Retention by milestone</h3>
      <div className="space-y-2">
        {milestones.map(m => (
          <div key={m.milestone} className="rounded-card border border-bdr-light bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Day {m.milestone}</div>
              <div className="text-sm text-txt-secondary">{m.total} total · {m.dual} dual-confirmed · {m.trainee_only ?? m.traineeOnly} trainee-only · {m.conflicted} conflicted</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <div className="h-2 rounded-pill bg-ok" style={{ flex: m.dual }}>{}</div>
              <div className="h-2 rounded-pill bg-warn" style={{ flex: m.traineeOnly }}>{}</div>
              <div className="h-2 rounded-pill bg-danger" style={{ flex: m.conflicted }}>{}</div>
            </div>
            <div className="text-xs mt-1.5 text-txt-secondary">Retention rate: <b>{m.retentionPct}%</b></div>
          </div>
        ))}
        {milestones.length === 0 && <div className="text-sm text-txt-secondary">Loading…</div>}
      </div>
      <p className="text-xs text-txt-secondary">
        Dual-confirmed = trainee + employer both said "still employed". This is what currently requires a phone survey months later. KSK does it automatically and in real time.
      </p>
    </div>
  )
}
