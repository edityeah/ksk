import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { Lock, ShieldCheck, ExternalLink } from 'lucide-react'

export default function SidhRedirectPage() {
  const { navigate, showToast } = useApp()
  const [sidhId, setSidhId] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [busy, setBusy] = useState(false)

  function fillDemo() { setSidhId('TRN-MB-1001'); setPassword('Demo@123'); setCaptcha('A8K2P') }

  async function submit() {
    if (!sidhId || !password) { showToast({ kind: 'warn', text: 'Enter SIDH ID and password' }); return }
    setBusy(true)
    try {
      const r = await api.sidhLogin(sidhId, password)
      sessionStorage.setItem('ksk.sidhSuccess.token', r.token)
      sessionStorage.setItem('ksk.sidhSuccess.user', JSON.stringify(r.user))
      navigate('sidh_verifying', true)
    } catch {
      showToast({ kind: 'danger', text: 'Invalid SIDH credentials' })
      navigate('sidh_fail', true)
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* fake browser url bar */}
      <div className="bg-white border-b border-bdr-light px-4 py-2 flex items-center gap-2">
        <Lock className="w-4 h-4 text-ok" />
        <div className="text-xs font-mono text-txt-secondary truncate flex-1">https://sidh.nsdc.in/auth/login</div>
        <ExternalLink className="w-4 h-4 text-txt-tertiary" />
      </div>
      {/* govt header */}
      <div className="bg-[#0A2540] text-white">
        <div className="tricolor-strip" />
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-white text-[#0A2540] flex items-center justify-center font-bold">SI</div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Ministry of Skill Development & Entrepreneurship</div>
            <div className="font-semibold">Skill India Digital Hub · SIDH</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-card shadow-card w-full max-w-md border border-bdr-light">
          <div className="px-6 py-5 border-b border-bdr-light flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <div className="font-semibold">Sign in with SIDH</div>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">SIDH ID</label>
              <input value={sidhId} onChange={e => setSidhId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary-500" placeholder="TRN-MB-1001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                className="w-full px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Captcha</label>
              <div className="flex gap-2">
                <div className="px-3 py-2 bg-slate-100 rounded font-mono select-none">A8K2P</div>
                <input value={captcha} onChange={e => setCaptcha(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary-500" placeholder="Enter captcha" />
              </div>
            </div>
            <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded bg-primary-500 text-white font-medium hover:bg-primary-600">
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
            <button onClick={fillDemo} className="w-full py-2 text-xs text-primary-600 hover:underline">Use demo credentials</button>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-bdr-light text-xs text-txt-tertiary text-center">
            © Skill India Digital Hub · A Government of India initiative
          </div>
        </div>
      </div>
    </div>
  )
}
