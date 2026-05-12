// SIDH login form — picks up the partner type set on the previous screen and
// shows it as context. Top-of-page back button to the partner selector.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../api/client.js'
import { Lock, ShieldCheck, ExternalLink, ChevronLeft } from 'lucide-react'
import NsdcLogo from '../components/NsdcLogo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'

export default function SidhRedirectPage() {
  const { navigate, goBack, showToast } = useApp()
  const partnerLabel = sessionStorage.getItem('ksk.sidhPartnerLabel') || 'Partner'
  const partnerType = sessionStorage.getItem('ksk.sidhPartnerType') || ''

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
    <div className="min-h-screen bg-slate-100 flex flex-col" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* fake browser url bar */}
      <div className="bg-white border-b border-bdr-light px-4 py-2 flex items-center gap-2">
        <button onClick={goBack} className="p-1 -ml-1 rounded hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4 text-txt-secondary" />
        </button>
        <Lock className="w-4 h-4 text-ok" />
        <div className="text-xs font-mono text-txt-secondary truncate flex-1">https://sidh.nsdc.in/auth/login</div>
        <ExternalLink className="w-4 h-4 text-txt-tertiary" />
      </div>
      {/* govt header */}
      <div className="bg-[#0A2540] text-white">
        <div style={{ background: 'linear-gradient(to right, #FF9933 33%, #FFFFFF 33% 66%, #138808 66%)', height: 4 }} />
        <div className="px-6 py-4 flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 rounded hover:bg-white/10 md:hidden">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="bg-white rounded-lg p-1.5 flex items-center"><NsdcLogo size={28} showText={false} /></div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider opacity-80">Ministry of Skill Development &amp; Entrepreneurship · NSDC</div>
            <div className="font-semibold">Skill India Digital Hub · SIDH</div>
          </div>
          <div className="hidden md:block bg-white rounded-lg px-2 py-1"><SwiftChatLogo size={22} showText={false} /></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-card shadow-card w-full max-w-md border border-bdr-light">
          <div className="px-6 py-5 border-b border-bdr-light flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-dark" />
              <div className="font-semibold">Sign in with SIDH</div>
            </div>
            {partnerType && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-primary-light text-primary">{partnerLabel}</span>
            )}
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">SIDH ID</label>
              <input value={sidhId} onChange={e => setSidhId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary" placeholder="TRN-MB-1001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                className="w-full px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">Captcha</label>
              <div className="flex gap-2">
                <div className="px-3 py-2 bg-slate-100 rounded font-mono select-none">A8K2P</div>
                <input value={captcha} onChange={e => setCaptcha(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-bdr-light rounded outline-none focus:border-primary" placeholder="Enter captcha" />
              </div>
            </div>
            <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded bg-primary text-white font-medium hover:bg-primary-dark">
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
            <button onClick={fillDemo} className="w-full py-2 text-xs text-primary-dark hover:underline">Use demo credentials</button>
            <button onClick={goBack} className="w-full py-1 text-xs text-txt-secondary hover:text-txt-primary">← Change partner type</button>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-bdr-light text-xs text-txt-tertiary text-center">
            © Skill India Digital Hub · A Government of India initiative
          </div>
        </div>
      </div>
    </div>
  )
}
