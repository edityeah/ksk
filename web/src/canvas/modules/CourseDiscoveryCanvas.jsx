import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function CourseDiscoveryCanvas() {
  const [courses, setCourses] = useState([])
  const [q, setQ] = useState('')
  useEffect(() => { api.courses().then(r => setCourses(r.courses || [])) }, [])
  const filtered = courses.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="p-5 space-y-3">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search courses, sectors, job roles…"
        className="w-full px-3 py-2 border border-bdr-light rounded-card outline-none focus:border-primary" />
      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="rounded-card border border-bdr-light bg-white p-3">
            <div className="text-sm font-medium">{c.name}</div>
            <div className="text-xs text-txt-secondary mt-0.5">{c.tp?.name} · {c.durationDays} days</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(c.jobRoles || []).map(jr => (
                <span key={jr.id} className="badge badge-info">{jr.jobRole?.name}</span>
              ))}
            </div>
            <button className="mt-2 px-3 py-1.5 text-xs rounded-pill bg-primary text-white">Apply</button>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-sm text-txt-secondary">No courses match.</div>}
      </div>
    </div>
  )
}
