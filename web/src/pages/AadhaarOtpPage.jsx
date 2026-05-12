// KSK Aadhaar OTP — split layout, 6-digit boxes, top-of-page back button.
// IMPORTANT: form JSX is inlined (not a nested component) so OTP input refs
// remain stable across renders.

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import Logo from '../components/Logo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'
import NsdcLogo from '../components/NsdcLogo.jsx'
import { ChevronLeft } from 'lucide-react'

const OTP_LEN = 6
const OTP_TIMER = 40

export default function AadhaarOtpPage() {
  const { goBack, completeLogin, showToast } = useApp()
  const aadhaar = sessionStorage.getItem('ksk.pendingAadhaar') || ''
  const maskedPhone = sessionStorage.getItem('ksk.aadhaarMaskedPhone') || ''

  const [otp, setOtp] = useState(Array(OTP_LEN).fill(''))
  const [status, setStatus] = useState('idle')
  const [secs, setSecs] = useState(OTP_TIMER)
  const [busy, setBusy] = useState(false)
  const refs = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(timerRef.current); return 0 } return s - 1 }), 1000)
    refs.current[0]?.focus()
    return () => clearInterval(timerRef.current)
  }, [])

  function handleChange(i, v) {
    const d = v.replace(/\D/g, '').slice(-1)
    setOtp(prev => { const n = [...prev]; n[i] = d; return n })
    setStatus('idle')
    if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus()
  }
  function handleKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus()
  }
  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    if (!text) return
    setOtp(prev => {
      const n = [...prev]
      text.split('').forEach((d, i) => { n[i] = d })
      return n
    })
    refs.current[Math.min(text.length, OTP_LEN - 1)]?.focus()
  }

  const filled = otp.every(d => d !== '')
  async function confirm() {
    if (!filled || busy) return
    setBusy(true)
    try {
      const r = await api.verifyAadhaarOtp(aadhaar, otp.join(''))
      setStatus('success')
      setTimeout(() => completeLogin(r.token, r.user), 900)
    } catch { setStatus('error'); setBusy(false) }
  }

  function boxStyle(d) {
    const base = { width: 44, height: 54, fontSize: 22, fontWeight: 700, borderRadius: 14, border: '2px solid', outline: 'none', textAlign: 'center', fontFamily: 'Montserrat, sans-serif' }
    if (status === 'error')   return { ...base, background: '#FFF0F0', borderColor: '#EF4444', color: '#EF4444' }
    if (status === 'success') return { ...base, background: '#F0FFF4', borderColor: '#10B981', color: '#10B981' }
    if (d)                    return { ...base, background: '#EEF3FF', borderColor: '#386AF6', color: '#1A1F36' }
    return { ...base, background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1A1F36' }
  }

  // Inline this JSX as a constant (NOT a component) so refs are stable.
  const formBody = (
    <div className="px-6 pb-6">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-tight mb-2">
          Enter the<br />
          <span className="text-primary">6-digit Aadhaar OTP</span>
        </h1>
        <p className="text-[14px] text-txt-secondary leading-relaxed">
          Sent to the phone linked to your Aadhaar: <span className="font-semibold text-txt-primary">{maskedPhone || '••••••••••'}</span>
        </p>
      </div>

      <div className="flex gap-2 mb-2" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el}
            type="tel" inputMode="numeric" maxLength={1} autoComplete="one-time-code"
            value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)}
            style={boxStyle(d)} />
        ))}
      </div>

      <div className="h-6 mb-4">
        {status === 'error'   && <p className="text-[13px] font-semibold text-danger">Oops! Wrong code. Try again.</p>}
        {status === 'success' && <p className="text-[13px] font-semibold text-ok">Hurray! Aadhaar verified 🎉</p>}
      </div>

      <button onClick={confirm} disabled={!filled || status === 'success' || busy}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: filled ? 'linear-gradient(135deg, #386AF6 0%, #5B85F8 100%)' : '#CBD5E1',
          boxShadow: filled ? '0 4px 16px rgba(56,106,246,0.35)' : 'none',
        }}>
        Verify Aadhaar
      </button>

      <div className="flex items-center justify-center mt-5">
        {secs > 0
          ? <p className="text-[13px] text-txt-secondary">Resend code in <span className="font-bold text-primary">{secs}s</span></p>
          : <p className="text-[13px] text-txt-secondary">Did not receive code? <button onClick={goBack} className="font-bold text-primary">Try again</button></p>}
      </div>
      <p className="text-center text-[10px] text-txt-tertiary mt-4">Demo OTP is <span className="font-mono font-bold">123456</span></p>
    </div>
  )

  const TopBackBar = () => (
    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
      <button onClick={goBack} className="inline-flex items-center gap-1 text-[13px] font-semibold text-txt-secondary hover:text-txt-primary px-2 py-1 rounded-lg hover:bg-slate-100">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className='flex items-center gap-3'><SwiftChatLogo size={26} /><div className='w-px h-6 bg-bdr' /><NsdcLogo size={22} showText={false} /></div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="hidden md:flex flex-col overflow-hidden"
        style={{ flex: '1 1 0', background: 'linear-gradient(135deg, #EEF3FF 0%, #F5F0FF 100%)' }}>
        <div className="p-6"><button onClick={goBack} className="inline-flex items-center gap-1 text-[13px] font-semibold text-txt-secondary hover:text-txt-primary"><ChevronLeft className="w-4 h-4" /> Back</button></div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-10 text-center">
          <div className="text-[140px]">🪪</div>
          <h3 className="text-[18px] font-bold">Aadhaar-verified login</h3>
          <p className="text-[13px] text-txt-secondary max-w-[260px]">Your KYC stays private — only the verification flag is stored.</p>
        </div>
      </div>
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto">
        <TopBackBar />
        {formBody}
      </div>
      <div className="hidden md:flex flex-col justify-center" style={{ width: 'clamp(340px, 38%, 460px)', flexShrink: 0, padding: '0 16px' }}>
        <div className="px-6 mb-6 mt-6"><div className='flex items-center gap-3'><SwiftChatLogo size={28} /><div className='w-px h-6 bg-bdr' /><NsdcLogo size={24} showText={false} /></div></div>
        {formBody}
      </div>
    </div>
  )
}
