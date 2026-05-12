import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { ChevronLeft } from 'lucide-react'

export default function PhoneEntryPage() {
  const { navigate, goBack, showToast } = useApp()
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoUsers, setDemoUsers] = useState([])

  useEffect(() => { api.demoUsers().then(r => setDemoUsers(r.users || [])).catch(() => {}) }, [])

  async function submit() {
    if (!/^\d{10}$/.test(phone)) { showToast({ kind: 'warn', text: 'Enter a 10-digit phone' }); return }
    setBusy(true)
    try {
      const r = await api.requestPhoneOtp(phone)
      sessionStorage.setItem('ksk.pendingPhone', phone)
      sessionStorage.setItem('ksk.pendingRole', r.role || '')
      navigate('phone_otp')
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'phone_not_registered' ? 'This phone is not registered' : 'Could not send OTP' })
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="tricolor-strip" />
      <button onClick={goBack} className="m-4 inline-flex items-center text-sm text-txt-secondary hover:text-txt-primary self-start">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <div className="px-6">
        <h1 className="text-2xl font-semibold">Enter your phone</h1>
        <p className="text-sm text-txt-secondary mt-1">We'll send a 4-digit code to verify.</p>
      </div>
      <div className="px-6 mt-6">
        <div className="flex border border-bdr-light rounded-card overflow-hidden focus-within:border-primary-500">
          <div className="px-3 py-3 bg-slate-50 text-sm text-txt-secondary border-r border-bdr-light">+91</div>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric" placeholder="98XXXXXXXX"
            className="flex-1 px-3 py-3 text-base outline-none" />
        </div>
        <button onClick={submit} disabled={busy || phone.length !== 10}
          className="mt-4 w-full py-3 rounded-card bg-primary-500 text-white font-medium disabled:bg-slate-300">
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
      </div>

      <div className="px-6 mt-8">
        <div className="text-xs font-medium text-txt-secondary mb-2 uppercase tracking-wider">Demo logins (tap to fill)</div>
        <div className="flex flex-wrap gap-2">
          {demoUsers.filter(u => u.phone).slice(0, 12).map(u => (
            <button key={u.id} onClick={() => setPhone(u.phone)}
              className="text-xs px-3 py-1.5 rounded-pill bg-slate-100 hover:bg-slate-200">
              <span className="font-medium">{u.role}</span> · {u.name}
            </button>
          ))}
        </div>
        <div className="text-xs text-txt-tertiary mt-3">Demo OTP is always <span className="font-mono">1234</span>.</div>
      </div>
    </div>
  )
}
