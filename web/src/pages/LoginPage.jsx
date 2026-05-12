import { useApp } from '../context/AppContext.jsx'
import { Phone, Fingerprint, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const { navigate } = useApp()
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="tricolor-strip" />
      <div className="px-6 pt-8">
        <div className="text-xs uppercase tracking-wider text-txt-secondary">Welcome</div>
        <h1 className="text-2xl font-semibold mt-1">Sign in to KSK</h1>
        <p className="text-sm text-txt-secondary mt-1">Choose how you'd like to continue.</p>
      </div>

      <div className="px-6 mt-8 space-y-3 flex-1">
        <LoginCard icon={<Phone className="w-5 h-5" />} title="Continue with Phone Number"
          subtitle="For trainees, trainers, employers and centres"
          onClick={() => navigate('phone_entry')} />
        <LoginCard icon={<Fingerprint className="w-5 h-5" />} title="Continue with Aadhaar (KYC)"
          subtitle="Verified trainee login — unlocks Skill Passport"
          onClick={() => navigate('aadhaar_entry')} />
        <LoginCard icon={<ShieldCheck className="w-5 h-5" />} title="Continue with SIDH"
          subtitle="For verified TPs, trainers, NSDC staff"
          onClick={() => navigate('sidh_redirect')} />
      </div>

      <div className="px-6 pb-8 text-xs text-txt-tertiary text-center">
        By continuing you agree to KSK's DPDP-A compliant data policy.
      </div>
    </div>
  )
}

function LoginCard({ icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full rounded-card border border-bdr-light bg-white p-4 hover:border-primary-500 hover:shadow-card text-left flex items-center gap-3 transition">
      <div className="w-10 h-10 rounded-pill bg-primary-light text-primary-600 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-txt-secondary mt-0.5">{subtitle}</div>
      </div>
      <div className="text-primary-600 text-xl">›</div>
    </button>
  )
}
