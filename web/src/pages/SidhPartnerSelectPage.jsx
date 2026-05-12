// SIDH Partner Type selector — mirrors the real SIDH portal's "Login as partner"
// grid. 19 partner types, each mapped to a KSK internal role.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Logo from '../components/Logo.jsx'
import {
  Share2, GraduationCap, Handshake, School, Award, ClipboardCheck, Building2,
  Users, Network, UserSquare2, BookOpen, Map, Settings, Briefcase, Layers,
  User, ClipboardList, Trophy, Landmark, ChevronLeft, Info,
} from 'lucide-react'
import NsdcLogo from '../components/NsdcLogo.jsx'
import SwiftChatLogo from '../components/SwiftChatLogo.jsx'

const PARTNERS = [
  // Field operations
  { id: 'mobilizer',         label: 'Mobilizer',          icon: Share2,         desc: 'Encourage candidate registrations using a personalised QR code.',                 maps: 'training_partner' },
  { id: 'trainer',           label: 'Trainer',            icon: GraduationCap,  desc: 'Empower individuals with essential skills & knowledge to be employable.',        maps: 'trainer' },
  { id: 'mentor',            label: 'Mentor',             icon: User,           desc: 'Guide and coach trainees through the skilling journey.',                         maps: 'trainer' },

  // Training providers
  { id: 'training_partner',  label: 'Training Partner',   icon: Handshake,      desc: 'Build a skilled workforce through industry-relevant training.',                  maps: 'training_partner' },
  { id: 'training_centre',   label: 'Training Centre',    icon: School,         desc: 'Provide specialised facilities for comprehensive skill development.',            maps: 'training_centre' },
  { id: 'btp',               label: 'Basic Training Providers — BTP', icon: BookOpen, desc: 'Deliver Basic Training under the Apprenticeship (NAPS) framework.',       maps: 'training_partner' },
  { id: 'institutional',     label: 'Institutional Partner', icon: Landmark,    desc: 'Universities, ITIs, and institutional bodies running skilling programmes.',     maps: 'training_partner' },

  // Accreditation / standards
  { id: 'awarding_body',     label: 'Awarding Body',      icon: Award,          desc: 'Accredit and certify individuals or institutions based on QP standards.',        maps: 'ssc' },
  { id: 'tpa',               label: 'TPA',                icon: Network,        desc: 'Third Party Aggregators consolidating capacity across partners.',                maps: 'ssc' },
  { id: 'apprenticeship_ssc',label: 'Apprenticeship SSC/AB', icon: Briefcase,   desc: 'Apprenticeship Sector Skills Council / Awarding Body for NAPS.',                 maps: 'ssc' },

  // Assessment
  { id: 'assessor',          label: 'Assessor',           icon: UserSquare2,    desc: 'Assess and evaluate the performance & competency of learners.',                  maps: 'assessor' },
  { id: 'assessment_agency', label: 'Assessment Agency',  icon: ClipboardCheck, desc: 'Conduct assessments to ensure standardised evaluation of skills.',               maps: 'assessor' },

  // Industry
  { id: 'establishment',     label: 'Establishment',      icon: Building2,      desc: 'Industry establishments hosting apprentices / verifying placements.',            maps: 'employer' },

  // NSDC / Govt admin
  { id: 'nsdc_admin',        label: 'NSDC Admin',         icon: Settings,       desc: 'NSDC administrative role across schemes, accreditations and outcomes.',          maps: 'nsdc_officer' },
  { id: 'rdsde',             label: 'RDSDE',              icon: Map,            desc: 'Regional Directorate Skill Development & Entrepreneurship — regional admin.',   maps: 'nsdc_officer' },
  { id: 'scheme_admin',      label: 'Scheme Admin',       icon: Layers,         desc: 'Per-scheme administrator: PMKVY, DDU-GKY, NAPS, SIB, PM Vishwakarma…',          maps: 'nsdc_officer' },
  { id: 'pmu',               label: 'Project Management Unit (PMU)', icon: ClipboardList, desc: 'Admin/PMU/Scheme administrator: assess and evaluate the requests.',     maps: 'nsdc_officer' },
  { id: 'india_skills',      label: 'India Skills Admin', icon: Trophy,         desc: 'Accredit and certify eligible participants of the India Skills 2025-26 competition.', maps: 'nsdc_officer' },

  // 19th — placeholder for the partner type the screenshots cut off
  { id: 'sector_skills',     label: 'Sector Skills Council', icon: Users,       desc: 'Sector body owning Qualification Packs and standards for a sector.',             maps: 'ssc' },
]

export default function SidhPartnerSelectPage() {
  const { navigate, goBack } = useApp()
  const [hover, setHover] = useState(null)

  function pick(p) {
    sessionStorage.setItem('ksk.sidhPartnerType', p.id)
    sessionStorage.setItem('ksk.sidhPartnerLabel', p.label)
    sessionStorage.setItem('ksk.sidhRoleMap', p.maps)
    navigate('sidh_redirect')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* SIDH chrome header */}
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
          <div className="hidden md:block bg-white rounded-lg px-2 py-1"><SwiftChatLogo size={22} showText={false} /></div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-8 pb-4">
        <div className="text-[12px] font-bold uppercase tracking-wider text-primary">Login as Partner</div>
        <h1 className="text-[28px] md:text-[32px] font-bold text-txt-primary mt-1 leading-tight">
          Select your <span className="text-primary">partner type</span>
        </h1>
        <p className="text-[14px] text-txt-secondary mt-1.5 max-w-2xl">
          KSK federates with SIDH for partner SSO. Choose how your organisation is registered with the
          National Skill Development Corporation. {PARTNERS.length} partner types supported.
        </p>
      </div>

      {/* Partner grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {PARTNERS.map(p => {
            const Icon = p.icon
            return (
              <button key={p.id} onClick={() => pick(p)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}
                className="relative text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] hover:shadow-card"
                style={{ borderColor: hover === p.id ? '#386AF6' : '#E8EDF5', background: '#fff', minHeight: 210 }}>
                <span className="absolute top-3 right-3 text-txt-tertiary hover:text-primary"><Info className="w-4 h-4" /></span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ background: hover === p.id ? '#EEF3FF' : '#F4F6FA' }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-[14px] font-bold text-txt-primary leading-tight">{p.label}</div>
                <p className="text-[12px] text-txt-secondary leading-snug mt-1.5 line-clamp-4">{p.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: '#F26B22' }}>
                  Login <span>→</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-bdr-light bg-[#F4F6FA] px-4 py-3 text-[12px] text-txt-secondary">
          <b className="text-txt-primary">Don't see your role?</b> Trainees, funders, and stipend payment officers
          should use phone OTP instead. <button onClick={() => navigate('login')} className="text-primary font-bold ml-1">← Back to login</button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0A2540] text-white text-center py-3 text-[11px] opacity-90">
        © Skill India Digital Hub · A Government of India initiative · NSDC · MSDE
      </div>
    </div>
  )
}
