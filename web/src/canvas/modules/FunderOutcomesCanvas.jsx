import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

export default function FunderOutcomesCanvas() {
  const [schemes, setSchemes] = useState([])
  useEffect(() => { api.funderOutcomes().then(r => setSchemes(r.schemes || [])) }, [])

  return (
    <div className="p-5 space-y-4">
      <div className="rounded-card border border-bdr-light bg-primary-light p-3 text-xs text-primary-dark">
        🛡️ Funder view. Verified outcomes only — no trainee PII shown. Numbers reflect the maker-checker triad: training partner + trainee + employer have all confirmed.
      </div>

      <div className="rounded-card border border-bdr-light bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-txt-secondary">
            <tr>
              <th className="text-left px-3 py-2">Scheme</th>
              <th className="text-right px-3 py-2">Enrolled</th>
              <th className="text-right px-3 py-2">Certified</th>
              <th className="text-right px-3 py-2">Verified placements</th>
              <th className="text-right px-3 py-2">90-day verified retention</th>
            </tr>
          </thead>
          <tbody>
            {schemes.map(s => (
              <tr key={s.scheme} className="border-t border-bdr-light">
                <td className="px-3 py-2"><div className="font-medium">{s.scheme}</div><div className="text-xs text-txt-secondary">{s.name}</div></td>
                <td className="px-3 py-2 text-right">{s.enrolled}</td>
                <td className="px-3 py-2 text-right">{s.certified}</td>
                <td className="px-3 py-2 text-right">{s.verifiedPlacements}</td>
                <td className="px-3 py-2 text-right">{s.retention90Verified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
