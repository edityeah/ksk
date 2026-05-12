import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import VerificationBadge from './_VerificationBadge.jsx'

export default function MyHiresCanvas() {
  const [list, setList] = useState([])
  useEffect(() => { api.placements().then(r => setList(r.placements || [])) }, [])
  return (
    <div className="p-5 space-y-3">
      <h3 className="text-sm font-semibold">My hires</h3>
      <div className="rounded-card border border-bdr-light bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-txt-secondary">
            <tr><th className="text-left px-3 py-2">Trainee</th><th className="text-left px-3 py-2">Role</th><th className="text-right px-3 py-2">CTC</th><th className="text-right px-3 py-2">State</th></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-t border-bdr-light">
                <td className="px-3 py-2">{p.trainee?.name}</td>
                <td className="px-3 py-2 text-xs text-txt-secondary">{p.role}</td>
                <td className="px-3 py-2 text-right">₹{p.ctcMonthly?.toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-right"><VerificationBadge state={p.state} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-txt-secondary">No hires yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
