import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const STEPS = [
  'Establishing secure channel…',
  'Verifying SIDH credentials…',
  'Fetching role and accreditation…',
  'Loading personalised workspace…',
  'Almost there…',
]

export default function SidhVerifyingPage() {
  const { navigate } = useApp()
  const [step, setStep] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 480)
    const done = setTimeout(() => navigate('sidh_success', true), 480 * STEPS.length)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [])

  const pct = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-[#0A2540] text-white">
        <div className="tricolor-strip" />
        <div className="px-6 py-3 text-sm">Skill India Digital Hub · SIDH</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-card shadow-card p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-4" />
          <div className="font-medium">{STEPS[step]}</div>
          <div className="w-full mt-6 h-2 bg-slate-100 rounded-pill overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
