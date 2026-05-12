// KSK Phone OTP — visually mirrors SwiftChat PhoneOTPPage. 4-digit OTP boxes with
// status colours, 40s resend timer, split mobile/desktop layout, paste handling.

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import Logo from '../components/Logo.jsx'

const OTP_LEN = 4
const OTP_TIMER = 40

export default function PhoneOtpPage() {
  const { navigate, goBack, completeLogin, showToast } = useApp()
  const phone = sessionStorage.getItem('ksk.pendingPhone') || ''
  const role = sessionStorage.getItem('ksk.pendingRole') || ''

  const [otp, setOtp] = useState(Array(OTP_LEN).fill(''))
  const [status, setStatus] = useState('idle')   // idle | error | success
  const [secs, setSecs] = useState(OTP_TIMER)
  const [busy, setBusy] = useState(false)
  const inputRefs = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(timerRef.current); return 0 } return s - 1 }), 1000)
    inputRefs.current[0]?.focus()
    return () => clearInterval(timerRef.current)
  }, [])

  function handleChange(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next); setStatus('idle')
    if (digit && i < OTP_LEN - 1) inputRefs.current[i + 1]?.focus()
  }
  function handleKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }
  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    if (!text) return
    const next = [...otp]
    text.split('').forEach((d, i) => { next[i] = d })
    setOtp(next); inputRefs.current[Math.min(text.length, OTP_LEN - 1)]?.focus()
  }

  const filled = otp.every(d => d !== '')

  async function confirm() {
    if (!filled || busy) return
    setBusy(true)
    try {
      const r = await api.verifyPhoneOtp(phone, otp.join(''))
      setStatus('success')
      setTimeout(() => completeLogin(r.token, r.user), 900)
    } catch {
      setStatus('error')
      setBusy(false)
    }
  }

  function resend() {
    clearInterval(timerRef.current); setSecs(OTP_TIMER); setOtp(Array(OTP_LEN).fill('')); setStatus('idle')
    inputRefs.current[0]?.focus()
    timerRef.current = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(timerRef.current); return 0 } return s - 1 }), 1000)
    api.requestPhoneOtp(phone).catch(() => {})
    showToast({ kind: 'success', text: 'OTP resent ✓' })
  }

  function boxStyle(d) {
    const base = { width: 56, height: 56, fontSize: 24, fontWeight: 700, borderRadius: 16, border: '2px solid', outline: 'none', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'Montserrat, sans-serif' }
    if (status === 'error')   return { ...base, background: '#FFF0F0', borderColor: '#EF4444', color: '#EF4444' }
    if (status === 'success') return { ...base, background: '#F0FFF4', borderColor: '#10B981', color: '#10B981' }
    if (d)                    return { ...base, background: '#EEF3FF', borderColor: '#386AF6', color: '#1A1F36' }
    return { ...base, background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1A1F36' }
  }

  const mask = phone ? `+91 ••••• ${phone.slice(-5)}` : '+91 ••••• •••••'

  const FormBody = () => (
    <div className="px-6 pb-6">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-tight mb-2" style={{ color: '#1A1F36' }}>
          Enter your<br />
          <span style={{ color: '#386AF6' }}>Verification code</span>
        </h1>
        <p className="text-[14px] text-txt-secondary leading-relaxed">
          Please enter the {OTP_LEN}-digit code sent to <span className="font-semibold text-txt-primary">{mask}</span>{' '}
          <button onClick={goBack} className="text-primary font-semibold">✏️</button>
        </p>
        {role && <div className="mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-primary-light text-primary">{role.replace(/_/g, ' ')}</div>}
      </div>

      <div className="flex gap-3 mb-2" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input key={i} ref={el => inputRefs.current[i] = el}
            type="tel" inputMode="numeric" maxLength={1}
            value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)}
            style={boxStyle(d)} />
        ))}
      </div>

      <div className="h-6 mb-4">
        {status === 'error'   && <p className="text-[13px] font-semibold" style={{ color: '#EF4444' }}>Oops! Wrong code. Please try again.</p>}
        {status === 'success' && <p className="text-[13px] font-semibold" style={{ color: '#10B981' }}>Hurray! OTP Verification Successful 🎉</p>}
      </div>

      <button onClick={confirm} disabled={!filled || status === 'success' || busy}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: filled ? 'linear-gradient(135deg, #386AF6 0%, #5B85F8 100%)' : '#CBD5E1',
          boxShadow: filled ? '0 4px 16px rgba(56,106,246,0.35)' : 'none',
        }}>
        Confirm
      </button>

      <div className="flex items-center justify-center mt-5">
        {secs > 0
          ? <p className="text-[13px] text-txt-secondary">Resend code in <span className="font-bold text-primary">{secs}s</span></p>
          : <p className="text-[13px] text-txt-secondary">Did not receive code? <button onClick={resend} className="font-bold text-primary">Resend OTP</button></p>}
      </div>

      <p className="text-center text-[10px] text-txt-tertiary mt-4">Demo OTP is <span className="font-mono font-bold">1234</span></p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="hidden md:flex flex-col items-center justify-center overflow-hidden"
        style={{ flex: '1 1 0', background: 'linear-gradient(135deg, #EEF3FF 0%, #F5F0FF 100%)' }}>
        <div className="relative flex flex-col items-center justify-center gap-6 px-10 text-center w-full h-full">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: 'rgba(56,106,246,0.07)', transform: 'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full" style={{ background: 'rgba(124,58,237,0.06)', transform: 'translate(-30%,30%)' }} />
          <div className="text-[140px] leading-none">🔐</div>
          <div>
            <h3 className="text-[18px] font-bold text-txt-primary mb-1">Quick & Secure</h3>
            <p className="text-[13px] text-txt-secondary max-w-[260px] leading-relaxed mx-auto">Your OTP expires in {OTP_TIMER} seconds. Never share it with anyone.</p>
          </div>
        </div>
      </div>

      <div className="md:hidden flex-1 flex flex-col overflow-y-auto bg-white">
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
