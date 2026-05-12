// Training partner / training centre flow: declare a placement for a trainee.

import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import VerificationBadge from './_VerificationBadge.jsx'

export default function PlacementDeclareCanvas() {
  const { showToast, closeCanvas } = useApp()
  const [trainees, setTrainees] = useState([])
  const [employers, setEmployers] = useState([])
  const [placements, setPlacements] = useState([])
  const [step, setStep] = useState('list')          // list | new
  const [form, setForm] = useState({ traineeId: '', employerId: '', role: '', ctcMonthly: 14000, joiningDate: new Date().toISOString().slice(0, 10) })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    (async () => {
      const [t, e, p] = await Promise.all([api.trainees(), api.get('/api/employers'), api.placements()])
      setTrainees(t.trainees || [])
      setEmployers(e.employers || [])
      setPlacements(p.placements || [])
    })()
  }, [])

  async function submit() {
    if (!form.traineeId || !form.employerId || !form.role) { showToast({ kind: 'warn', text: 'Fill all fields' }); return }
    setSubmitting(true)
    try {
      const r = await api.declarePlacement({
        traineeId: form.traineeId, employerId: form.employerId, role: form.role,
        ctcMonthly: Number(form.ctcMonthly), joiningDate: form.joiningDate,
        employmentType: 'wage', appointmentLetterUrl: null,
      })
      showToast({ kind: 'success', text: 'Placement declared. Trainee and employer notified for verification.' })
      const p = await api.placements(); setPlacements(p.placements || [])
      setStep('list')
    } catch { showToast({ kind: 'danger', text: 'Could not declare placement.' }) }
    finally { setSubmitting(false) }
  }

  if (step === 'new') {
    return (
      <div className="p-5 space-y-3">
        <button onClick={() => setStep('list')} className="text-xs text-primary-600">‹ Back to list</button>
        <h3 className="text-base font-semibold">Declare a new placement</h3>
        <Field label="Trainee">
          <select value={form.traineeId} onChange={e => setForm({ ...form, traineeId: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2">
            <option value="">— select —</option>
            {trainees.map(t => <option key={t.id} value={t.id}>{t.name} · {t.state}</option>)}
          </select>
        </Field>
        <Field label="Employer">
          <select value={form.employerId} onChange={e => setForm({ ...form, employerId: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2">
            <option value="">— select —</option>
            {employers.map(e => <option key={e.id} value={e.id}>{e.name} · {e.city}</option>)}
          </select>
        </Field>
        <Field label="Job role"><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2" placeholder="Retail Sales Associate" /></Field>
        <Field label="Monthly CTC (₹)"><input value={form.ctcMonthly} onChange={e => setForm({ ...form, ctcMonthly: e.target.value.replace(/\D/g, '') })} className="w-full border border-bdr-light rounded px-3 py-2" /></Field>
        <Field label="Joining date"><input type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} className="w-full border border-bdr-light rounded px-3 py-2" /></Field>
        <button disabled={submitting} onClick={submit}
          className="mt-2 w-full py-2.5 rounded-card bg-primary-500 text-white font-medium disabled:bg-slate-300">
          {submitting ? 'Declaring…' : 'Declare placement'}
        </button>
        <div className="text-xs text-txt-secondary mt-1">
          Once you declare, the trainee and employer will each receive an independent confirmation request inside SwiftChat. Payment clock starts only when both confirm.
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Placements you've declared</h3>
          <p className="text-xs text-txt-secondary">{placements.length} total</p>
        </div>
        <button onClick={() => setStep('new')} className="px-3 py-1.5 rounded-card bg-primary-500 text-white text-sm">+ New</button>
      </div>
      <div className="divide-y divide-bdr-light rounded-card border border-bdr-light bg-white">
        {placements.map(p => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.trainee?.name} → {p.employer?.name}</div>
              <div className="text-xs text-txt-secondary truncate">{p.role} · ₹{p.ctcMonthly?.toLocaleString('en-IN')}/mo · joined {new Date(p.joiningDate).toLocaleDateString()}</div>
            </div>
            <VerificationBadge state={p.state} />
          </div>
        ))}
        {placements.length === 0 && <div className="p-4 text-sm text-txt-secondary">No placements yet.</div>}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><div className="text-xs font-medium text-txt-secondary mb-1">{label}</div>{children}</label>
}
