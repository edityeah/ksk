// KSK Aadhaar Entry — split mobile/desktop layout matching SwiftChat style.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import Logo from '../components/Logo.jsx'
import { Fingerprint } from 'lucide-react'

export default function AadhaarEntryPage() {
  const { navigate, goBack, showToast } = useApp()
  const [aadhaar, setAadhaar] = useState('')
  const [busy, setBusy] = useState(false)

  const format = s => s.replace(/\D/g, '').slice(0, 12).replace(/(.{4})/g, '$1 ').trim()
  const onChange = e => setAadhaar(format(e.target.value))
  const norm = aadhaar.replace(/\s/g, '')
  const canProceed = norm.length === 12

  async function submit() {
    if (!canProceed) return
    setBusy(true)
    try {
      const r = await api.requestAadhaarOtp(norm)
      sessionStorage.setItem('ksk.pendingAadhaar', norm)
      sessionStorage.setItem('ksk.aadhaarMaskedPhone', r.maskedPhone || '')
      navigate('aadhaar_otp')
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'aadhaar_not_registered' ? 'Aadhaar not registered. Try demo: 1234 5678 9012' : 'Could not send OTP.' })
    } finally { setBusy(false) }
  }

  const FormBody = () => (
    <div className="px-6 pb-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-light text-primary text-[11px] font-bold mb-3">
          <Fingerprint className="w-3 h-3" /> AADHAAR KYC · TRAINEE
        </div>
        <h1 className="text-[28px] font-bold leading-tight mb-2">
          Verify with<br />
          <span className="text-primary">your Aadhaar</span>
        </h1>
        <p className="text-[14px] text-txt-secondary leading-relaxed">
          We'll send an OTP to the phone number linked to this Aadhaar. This unlocks your Skill Passport.
        </p>
      </div>

      <div className="mb-6">
        <label className="text-[12px] font-semibold text-txt-secondary uppercase tracking-[0.5px] mb-2 block">Aadhaar Number</label>
        <div className="flex items-center rounded-2xl border-[1.5px] overflow-hidden" style={{ borderColor: norm.length > 0 ? '#386AF6' : '#E2E8F0' }}>
          <input value={aadhaar} onChange={onChange} inputMode="numeric" placeholder="1234 5678 9012"
            className="flex-1 px-4 py-3.5 text-[16px] font-mono tracking-wider text-txt-primary bg-white outline-none" />
        </div>
        <p className="text-[11px] text-txt-tertiary mt-2">Demo Aadhaars: <span className="font-mono font-bold">1234 5678 9012</span> (Rani), <span className="font-mono font-bold">2345 6789 0123</span> (Imran)</p>
      </div>

      <button onClick={submit} disabled={!canProceed || busy}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: canProceed ? 'linear-gradient(135deg, #386AF6 0%, #5B85F8 100%)' : '#CBD5E1',
          boxShadow: canProceed ? '0 4px 16px rgba(56,106,246,0.35)' : 'none',
        }}>
        {busy ? 'Sending…' : 'Send OTP to linked phone'}
      </button>

      <button onClick={goBack} className="mt-4 text-[13px] text-txt-secondary text-center w-full">← Back to login options</button>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="hidden md:flex flex-col items-center justify-center overflow-hidden"
        style={{ flex: '1 1 0', background: 'linear-gradient(135deg, #EEF3FF 0%, #F5F0FF 100%)' }}>
        <div className="relative flex flex-col items-center justify-center gap-6 px-10 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: 'rgba(56,106,246,0.07)', transform: 'translate(30%,-30%)' }} />
          <div className="text-[140px]">🪪</div>
          <h3 className="text-[18px] font-bold">Verified credential</h3>
          <p className="text-[13px] text-txt-secondary max-w-[260px]">Aadhaar KYC unlocks your verified Skill Passport — share it with employers in one tap.</p>
        </div>
      </div>
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto">
        <div className="px-6 pt-6 pb-2"><Logo size={30} showText /></div>
        <FormBody />
      </div>
      <div className="hidden md:flex flex-col justify-center" style={{ width: 'clamp(340px, 38%, 460px)', flexShrink: 0, padding: '0 16px' }}>
        <div className="mb-8 px-6"><Logo size={30} showText /></div>
        <FormBody />
      </div>
    </div>
  )
}
