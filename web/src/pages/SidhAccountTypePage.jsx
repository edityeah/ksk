// SIDH Account Type — first choice after "Login with SIDH". Mirrors the real
// SIDH portal: two large cards, Learner/Participant vs Partner.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ChevronLeft, Info } from 'lucide-react'
import NsdcLogo from '../components/NsdcLogo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'

export default function SidhAccountTypePage() {
  const { navigate, goBack } = useApp()
  const [hover, setHover] = useState(null)

  function pick(kind) {
    if (kind === 'learner') {
      sessionStorage.setItem('ksk.sidhPartnerType', 'learner')
      sessionStorage.setItem('ksk.sidhPartnerLabel', 'Learner / Participant')
      sessionStorage.setItem('ksk.sidhRoleMap', 'trainee')
      navigate('sidh_redirect')
    } else {
      navigate('sidh_partners')
    }
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
      <div className="max-w-5xl w-full mx-auto px-6 pt-10 pb-6">
        <div className="text-[12px] font-bold uppercase tracking-wider text-primary">Sign in to SIDH</div>
        <h1 className="text-[28px] md:text-[34px] font-bold text-txt-primary mt-1 leading-tight">
          How would you like <span className="text-primary">to continue?</span>
        </h1>
        <p className="text-[14px] text-txt-secondary mt-1.5 max-w-2xl">
          Choose your account type. Learners discover skilling courses and certifications. Partners
          deliver, assess, accredit, or administer the skilling ecosystem.
        </p>
      </div>

      {/* Two cards */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card
            hover={hover === 'learner'} onHover={() => setHover('learner')} onLeave={() => setHover(null)}
            onClick={() => pick('learner')}
            title="Learner / Participant"
            desc="Learn from several Skill Courses, find Skill Centres near you, build a verified Skill Passport, get placed, and track your stipend."
            illustration={<LearnerIllustration />}
          />
          <Card
            hover={hover === 'partner'} onHover={() => setHover('partner')} onLeave={() => setHover(null)}
            onClick={() => pick('partner')}
            title="Partner"
            desc="Training Partner, Training Centre, Trainer, Assessor, Awarding Body, Employer, NSDC Admin, Mentor, and more — 19 partner types."
            illustration={<PartnerIllustration />}
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

      {/* Footer */}
      <div className="bg-[#0A2540] text-white text-center py-3 text-[11px] opacity-90">
        © Skill India Digital Hub · A Government of India initiative · NSDC · MSDE
      </div>
    </div>
  )
}

function Card({ hover, onHover, onLeave, onClick, title, desc, illustration }) {
  return (
    <button onClick={onClick} onMouseEnter={onHover} onMouseLeave={onLeave}
      className="relative text-left rounded-2xl border-2 p-5 md:p-7 transition-all active:scale-[0.98] hover:shadow-card flex items-center gap-4 md:gap-6"
      style={{ borderColor: hover ? '#386AF6' : '#E8EDF5', background: '#fff', minHeight: 160 }}>
      <div className="flex-shrink-0">{illustration}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[20px] md:text-[24px] font-bold text-txt-primary leading-tight">{title}</div>
        <p className="text-[13px] text-txt-secondary leading-snug mt-2 line-clamp-3">{desc}</p>
        <div className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: '#F26B22' }}>
          Continue <span>→</span>
        </div>
      </div>
      <div className="absolute top-4 left-4 w-5 h-5 rounded-full border-2" style={{ borderColor: hover ? '#386AF6' : '#CBD5E1' }} />
    </button>
  )
}

// ── Inline SVG illustrations (mirrors the SIDH portal cards) ───────────────
function LearnerIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="120" rx="68" ry="14" fill="#EEF2FF" />
      <circle cx="50" cy="78" r="34" fill="#EEF2FF" />
      {/* student with book */}
      <g transform="translate(28 50)">
        <rect x="6" y="48" width="36" height="32" rx="4" fill="#386AF6" />
        <circle cx="24" cy="36" r="14" fill="#FFD7B3" />
        <path d="M10 36 a14 14 0 0 1 28 0 v-3 a14 14 0 0 0 -28 0z" fill="#2755E3" />
        <rect x="18" y="58" width="12" height="3" fill="#fff" opacity="0.5" />
      </g>
      {/* second student with laptop */}
      <g transform="translate(72 56)">
        <rect x="0" y="48" width="44" height="28" rx="4" fill="#FF9933" />
        <circle cx="22" cy="38" r="12" fill="#FFD7B3" />
        <path d="M10 38 a12 12 0 0 1 24 0 v-2 a12 12 0 0 0 -24 0z" fill="#7C3A0A" />
        <rect x="10" y="56" width="24" height="3" fill="#fff" opacity="0.5" />
      </g>
      {/* book/laptop accents */}
      <rect x="100" y="98" width="28" height="18" rx="2" fill="#0A2540" />
      <rect x="103" y="100" width="22" height="13" fill="#5B89FF" />
    </svg>
  )
}

function PartnerIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="120" rx="68" ry="14" fill="#EEF2FF" />
      <circle cx="80" cy="80" r="58" fill="#EEF2FF" opacity="0.6" />
      {/* two people shaking hands */}
      <g transform="translate(20 38)">
        <circle cx="22" cy="22" r="14" fill="#FFD7B3" />
        <path d="M8 22 a14 14 0 0 1 28 0 v-2 a14 14 0 0 0 -28 0z" fill="#2755E3" />
        <rect x="4" y="36" width="40" height="36" rx="4" fill="#FF9933" />
      </g>
      <g transform="translate(80 38)">
        <circle cx="22" cy="22" r="14" fill="#FFD7B3" />
        <path d="M8 22 a14 14 0 0 1 28 0 v-2 a14 14 0 0 0 -28 0z" fill="#7C3A0A" />
        <rect x="4" y="36" width="40" height="36" rx="4" fill="#386AF6" />
      </g>
      {/* handshake */}
      <rect x="64" y="80" width="32" height="8" rx="4" fill="#FFD7B3" stroke="#0A2540" strokeWidth="1.5" />
      {/* rupee coin accents */}
      <circle cx="42" cy="40" r="10" fill="#FF9933" />
      <text x="42" y="44" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">₹</text>
      <circle cx="120" cy="50" r="10" fill="#FF9933" />
      <text x="120" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">₹</text>
      <circle cx="118" cy="86" r="9" fill="#FF9933" />
      <text x="118" y="89" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">₹</text>
    </svg>
  )
}
