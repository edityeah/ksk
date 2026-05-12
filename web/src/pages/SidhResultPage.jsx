import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function SidhResultPage({ ok }) {
  const { navigate, completeLogin } = useApp()

  useEffect(() => {
    if (!ok) return
    const token = sessionStorage.getItem('ksk.sidhSuccess.token')
    const userStr = sessionStorage.getItem('ksk.sidhSuccess.user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!token || !user) { navigate('login', true); return }
    const t = setTimeout(() => completeLogin(token, user), 1800)
    return () => clearTimeout(t)
  }, [ok])

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-[#0A2540] text-white">
        <div className="tricolor-strip" />
        <div className="px-6 py-3 text-sm">Skill India Digital Hub · SIDH</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className={`bg-white rounded-card shadow-card p-8 w-full max-w-md text-center border-t-4 ${ok ? 'border-ok' : 'border-danger'}`}>
          {ok ? <CheckCircle2 className="w-14 h-14 text-ok mx-auto" /> : <XCircle className="w-14 h-14 text-danger mx-auto" />}
          <div className="text-xl font-semibold mt-3">{ok ? 'Verification Successful' : 'Verification Failed'}</div>
          <div className="text-sm text-txt-secondary mt-2">
            {ok ? 'Redirecting you to KSK…' : 'We could not verify your SIDH credentials.'}
          </div>
          {!ok && (
            <button onClick={() => navigate('login', true)}
              className="mt-5 w-full py-2.5 rounded bg-primary text-white font-medium">Try again</button>
          )}
        </div>
      </div>
    </div>
  )
}
