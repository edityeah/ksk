import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { ChevronLeft } from 'lucide-react'

export default function PhoneOtpPage() {
  const { navigate, goBack, showToast, completeLogin } = useApp()
  const phone = sessionStorage.getItem('ksk.pendingPhone') || ''
  const role = sessionStorage.getItem('ksk.pendingRole') || ''
  const [otp, setOtp] = useState(['', '', '', ''])
  const refs = useRef([])
  const [busy, setBusy] = useState(false)

  useEffect(() => { refs.current[0]?.focus() }, [])

  function setDigit(i, v) {
    const c = v.replace(/\D/g, '').slice(-1)
    setOtp(prev => { const n = [...prev]; n[i] = c; return n })
    if (c && i < 3) refs.current[i + 1]?.focus()
  }

  async function verify() {
    const code = otp.join('')
    if (code.length !== 4) return
    setBusy(true)
    try {
      const r = await api.verifyPhoneOtp(phone, code)
      await completeLogin(r.token, r.user)
    } catch {
      showToast({ kind: 'danger', text: 'Invalid OTP' })
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="tricolor-strip" />
      <button onClick={goBack} className="m-4 inline-flex items-center text-sm text-txt-secondary self-start">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="px-6">
        <h1 className="text-2xl font-semibold">Enter OTP</h1>
        <p className="text-sm text-txt-secondary mt-1">Sent to <b>+91 {phone}</b> {role && <span className="badge badge-info ml-1">{role}</span>}</p>
      </div>
      <div className="px-6 mt-8">
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <input key={i} ref={el => refs.current[i] = el}
              value={otp[i]} onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus() }}
              inputMode="numeric" maxLength={1}
              className="w-14 h-14 text-center text-2xl border border-bdr-light rounded-card focus:border-primary-500 outline-none" />
          ))}
        </div>
        <button onClick={verify} disabled={busy || otp.join('').length !== 4}
          className="mt-6 w-full py-3 rounded-card bg-primary-500 text-white font-medium disabled:bg-slate-300">
          {busy ? 'Verifying…' : 'Verify'}
        </button>
        <div className="text-xs text-txt-tertiary mt-3">Demo OTP is <span className="font-mono">1234</span>.</div>
      </div>
    </div>
  )
}
