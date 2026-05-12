import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { ChevronLeft, Fingerprint } from 'lucide-react'

export default function AadhaarEntryPage() {
  const { navigate, goBack, showToast } = useApp()
  const [aadhaar, setAadhaar] = useState('')
  const [busy, setBusy] = useState(false)

  function format(s) {
    const d = s.replace(/\D/g, '').slice(0, 12)
    return d.replace(/(.{4})/g, '$1 ').trim()
  }

  async function submit() {
    const norm = aadhaar.replace(/\s|-/g, '')
    if (norm.length !== 12) { showToast({ kind: 'warn', text: 'Enter 12-digit Aadhaar' }); return }
    setBusy(true)
    try {
      const r = await api.requestAadhaarOtp(norm)
      sessionStorage.setItem('ksk.pendingAadhaar', norm)
      sessionStorage.setItem('ksk.aadhaarMaskedPhone', r.maskedPhone || '')
      navigate('aadhaar_otp')
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'aadhaar_not_registered' ? 'Aadhaar not registered' : 'Could not send OTP' })
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="tricolor-strip" />
      <button onClick={goBack} className="m-4 inline-flex items-center text-sm text-txt-secondary self-start">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="px-6">
        <div className="inline-flex items-center gap-2 mb-2 text-primary-600">
          <Fingerprint className="w-5 h-5" /><span className="text-sm font-medium">Aadhaar KYC</span>
        </div>
        <h1 className="text-2xl font-semibold">Enter your Aadhaar</h1>
        <p className="text-sm text-txt-secondary mt-1">We'll send an OTP to the phone number linked to this Aadhaar.</p>
      </div>
      <div className="px-6 mt-6">
        <input value={aadhaar} onChange={e => setAadhaar(format(e.target.value))}
          inputMode="numeric" placeholder="1234 5678 9012"
          className="w-full px-4 py-3 border border-bdr-light rounded-card outline-none focus:border-primary-500 text-base font-mono tracking-wider" />
        <button onClick={submit} disabled={busy || aadhaar.replace(/\s/g, '').length !== 12}
          className="mt-4 w-full py-3 rounded-card bg-primary-500 text-white font-medium disabled:bg-slate-300">
          {busy ? 'Sending…' : 'Send OTP to linked phone'}
        </button>
        <div className="text-xs text-txt-tertiary mt-3">Demo Aadhaars: <span className="font-mono">1234 5678 9012</span> (Rani), <span className="font-mono">2345 6789 0123</span> (Imran)</div>
      </div>
    </div>
  )
}
