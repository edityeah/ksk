import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { ChevronLeft } from 'lucide-react'

export default function AadhaarOtpPage() {
  const { goBack, showToast, completeLogin } = useApp()
  const aadhaar = sessionStorage.getItem('ksk.pendingAadhaar') || ''
  const maskedPhone = sessionStorage.getItem('ksk.aadhaarMaskedPhone') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const refs = useRef([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { refs.current[0]?.focus() }, [])

  function setDigit(i, v) {
    const c = v.replace(/\D/g, '').slice(-1)
    setOtp(prev => { const n = [...prev]; n[i] = c; return n })
    if (c && i < 5) refs.current[i + 1]?.focus()
  }

  async function verify() {
    const code = otp.join('')
    if (code.length !== 6) return
    setBusy(true)
    try {
      const r = await api.verifyAadhaarOtp(aadhaar, code)
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
        <h1 className="text-2xl font-semibold">Aadhaar OTP</h1>
        <p className="text-sm text-txt-secondary mt-1">Sent to linked phone <b>{maskedPhone}</b></p>
      </div>
      <div className="px-6 mt-8">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <input key={i} ref={el => refs.current[i] = el}
              value={otp[i]} onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus() }}
              inputMode="numeric" maxLength={1}
              className="w-12 h-14 text-center text-2xl border border-bdr-light rounded-card focus:border-primary-500 outline-none" />
          ))}
        </div>
        <button onClick={verify} disabled={busy || otp.join('').length !== 6}
          className="mt-6 w-full py-3 rounded-card bg-primary-500 text-white font-medium disabled:bg-slate-300">
          {busy ? 'Verifying…' : 'Verify Aadhaar'}
        </button>
        <div className="text-xs text-txt-tertiary mt-3">Demo OTP is <span className="font-mono">123456</span>.</div>
      </div>
    </div>
  )
}
