import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function JobsMarketplaceCanvas() {
  const [jobs, setJobs] = useState([])
  useEffect(() => { api.get('/api/jobs').then(r => setJobs(r.jobs || [])) }, [])
  return (
    <div className="p-5 space-y-2">
      <h3 className="text-sm font-semibold">Open jobs</h3>
      {jobs.map(j => (
        <div key={j.id} className="rounded-card border border-bdr-light bg-white p-3">
          <div className="text-sm font-medium">{j.title}</div>
          <div className="text-xs text-txt-secondary">{j.employer?.name} · {j.location} · ₹{j.ctcMonthly?.toLocaleString('en-IN')}/mo · {j.openings} openings</div>
          <button className="mt-2 px-3 py-1 rounded-pill bg-primary text-white text-xs">Apply with Skill Passport</button>
        </div>
      ))}
      {jobs.length === 0 && <div className="text-sm text-txt-secondary">No open jobs.</div>}
    </div>
  )
}
