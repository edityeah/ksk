// SIDH Account Type — first choice after "Login with SIDH".
// Four buckets: Learner · Participant · Partner · Admin.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ChevronLeft, Info } from 'lucide-react'
import NsdcLogo from '../components/NsdcLogo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'

export default function SidhAccountTypePage() {
  const { navigate, goBack } = useApp()
  const [hover, setHover] = useState(null)

  function pickLearner() {
    sessionStorage.setItem('ksk.sidhPartnerType', 'learner')
    sessionStorage.setItem('ksk.sidhPartnerLabel', 'Learner / Participant')
    sessionStorage.setItem('ksk.sidhRoleMap', 'trainee')
    navigate('sidh_redirect')
  }
  function pickPartner() {
    sessionStorage.setItem('ksk.sidhMode', 'partner')
    navigate('sidh_partners')
  }
  function pickAdmin() {
    sessionStorage.setItem('ksk.sidhMode', 'admin')
    navigate('sidh_partners')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* SIDH chrome */}
      <div className="bg-[#0A2540] text-white">
        <div style={{ background: 'linear-gradient(to right, #FF9933 33%, #FFFFFF 33% 66%, #138808 66%)', height: 4 }} />
        <div className="px-6 py-3 flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 rounded hover:bg-white/10" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="bg-white rounded-lg p-1.5 flex items-center"><NsdcLogo size={28} showText={false} /></div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Ministry of Skill Development &amp; Entrepreneurship · NSDC</div>
            <div className="text-[14px] font-semibold">Skill India Digital Hub · SIDH</div>
          </div>
          <div className="hidden md:block bg-white rounded-lg px-2 py-1"><SwiftChatLogo size={24} showText={false} /></div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-10 pb-6">
        <div className="text-[12px] font-bold uppercase tracking-wider text-primary">Sign in to SIDH</div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-txt-primary mt-1 leading-tight">
          How would you like <span className="text-primary">to continue?</span>
        </h1>
        <p className="text-[14px] text-txt-secondary mt-1.5 max-w-2xl">
          Choose your account type. Learners and Participants are individuals; Partners
          deliver, assess and accredit; Admins govern schemes and the ecosystem.
        </p>
      </div>

      {/* Three cards */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            hover={hover === 'learner'} onHover={() => setHover('learner')} onLeave={() => setHover(null)}
            onClick={pickLearner}
            title="Learner / Participant"
            desc="Discover skilling courses, enrol in schemes (PMKVY, NAPS, DDU-GKY), build a verified Skill Passport, get placed and tracked through retention."
            illustration={<LearnerIllustration />}
          />
          <Card
            hover={hover === 'partner'} onHover={() => setHover('partner')} onLeave={() => setHover(null)}
            onClick={pickPartner}
            title="Partner"
            desc="Training Partner, Training Centre, Trainer, Mentor, Assessor, Assessment Agency, Awarding Body, BTP, Institutional Partner, Establishment and more."
            illustration={<PartnerIllustration />}
          />
          <Card
            hover={hover === 'admin'} onHover={() => setHover('admin')} onLeave={() => setHover(null)}
            onClick={pickAdmin}
            title="Admin"
            desc="NSDC Admin, Scheme Admin, Sector Skills Council, India Skills Admin, RDSDE, PMU — govern and administer the skilling ecosystem."
            illustration={<AdminIllustration />}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-bdr-light bg-[#F4F6FA] px-4 py-3 text-[12px] text-txt-secondary flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <b className="text-txt-primary">No SIDH account?</b> Trainees can also log in with phone OTP or Aadhaar KYC.
            <button onClick={() => navigate('login')} className="text-primary font-bold ml-1">← Back to login options</button>
          </div>
        </div>
      </div>

      <div className="bg-[#0A2540] text-white text-center py-3 text-[11px] opacity-90">
        © Skill India Digital Hub · A Government of India initiative · NSDC · MSDE
      </div>
    </div>
  )
}

function Card({ hover, onHover, onLeave, onClick, title, desc, illustration }) {
  return (
    <button onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
      className="relative text-left rounded-2xl border-2 p-5 transition-all active:scale-[0.98] hover:shadow-card flex flex-col items-center gap-3"
      style={{ borderColor: hover ? '#386AF6' : '#E8EDF5', background: '#fff', minHeight: 270 }}>
      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2" style={{ borderColor: hover ? '#386AF6' : '#CBD5E1' }} />
      <div className="mt-2">{illustration}</div>
      <div className="text-center">
        <div className="text-[18px] font-bold text-txt-primary leading-tight">{title}</div>
        <p className="text-[12px] text-txt-secondary leading-snug mt-2 line-clamp-4">{desc}</p>
      </div>
      <div className="mt-auto inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: '#F26B22' }}>
        Continue <span>→</span>
      </div>
    </button>
  )
}

// ── Illustrations ────────────────────────────────────────────────────────
function LearnerIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#EEF2FF" />
      <circle cx="50" cy="38" r="12" fill="#FFD7B3" />
      <path d="M34 38 a16 16 0 0 1 32 0 v-4 a16 16 0 0 0 -32 0z" fill="#386AF6" />
      <rect x="32" y="56" width="36" height="26" rx="4" fill="#FF9933" />
      <rect x="22" y="60" width="22" height="14" rx="2" fill="#0A2540" />
      <rect x="24" y="62" width="18" height="10" fill="#5B89FF" />
    </svg>
  )
}
function PartnerIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#EEF2FF" />
      <g>
        <circle cx="32" cy="32" r="9" fill="#FFD7B3" />
        <path d="M23 32 a9 9 0 0 1 18 0 v-2 a9 9 0 0 0 -18 0z" fill="#386AF6" />
        <rect x="18" y="42" width="28" height="30" rx="3" fill="#FF9933" />
      </g>
      <g>
        <circle cx="68" cy="32" r="9" fill="#FFD7B3" />
        <path d="M59 32 a9 9 0 0 1 18 0 v-2 a9 9 0 0 0 -18 0z" fill="#7C3A0A" />
        <rect x="54" y="42" width="28" height="30" rx="3" fill="#138808" />
      </g>
      <rect x="40" y="56" width="20" height="6" rx="3" fill="#FFD7B3" stroke="#0A2540" strokeWidth="1" />
    </svg>
  )
}
function AdminIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#E0F2FE" />
      {/* shield */}
      <path d="M50 12 L78 22 V52 C78 70 65 82 50 88 C35 82 22 70 22 52 V22 L50 12 Z" fill="#0A2540" stroke="#fff" strokeWidth="2" />
      <path d="M50 22 L70 30 V52 C70 64 60 73 50 78 C40 73 30 64 30 52 V30 L50 22 Z" fill="#386AF6" />
      <path d="M40 50 L48 58 L62 42" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="35" r="3" fill="#FF9933" />
    </svg>
  )
}
