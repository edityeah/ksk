// SIDH Partner Type selector — mirrors the real SIDH portal's "Login as partner"
// grid. 10 partner types, each routes to the SIDH redirect page with that partner
// type as context.

import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Logo from '../components/Logo.jsx'
import {
  Share2, GraduationCap, Handshake, School, Award,
  ClipboardCheck, Building2, Users, Network, UserSquare2, ChevronLeft, Info,
} from 'lucide-react'

const PARTNERS = [
  { id: 'mobilizer',         label: 'Mobilizer',          icon: Share2,         desc: 'Encourage candidate registrations using a personalised QR…',                       maps: 'training_partner' },
  { id: 'trainer',           label: 'Trainer',            icon: GraduationCap,  desc: 'Empower individuals with essential skills & knowledge to be…',                  maps: 'trainer' },
  { id: 'training_partner',  label: 'Training Partner',   icon: Handshake,      desc: 'Build a skilled workforce through industry-relevant training.',                  maps: 'training_partner' },
  { id: 'training_centre',   label: 'Training Centre',    icon: School,         desc: 'Provide specialized facilities for comprehensive skill development.',            maps: 'training_centre' },
  { id: 'awarding_body',     label: 'Awarding Body',      icon: Award,          desc: 'Accredit and certify individuals or institutions based on specific… standards', maps: 'ssc' },
  { id: 'assessor',          label: 'Assessor',           icon: UserSquare2,    desc: 'Assess and evaluate the performance & competency of learners.',                  maps: 'assessor' },
  { id: 'assessment_agency', label: 'Assessment Agency',  icon: ClipboardCheck, desc: 'Conduct assessments to ensure standardised evaluation of skills.',               maps: 'assessor' },
  { id: 'establishment',     label: 'Establishment',      icon: Building2,      desc: 'Assess and evaluate the performance & competency of learners.',                  maps: 'employer' },
  { id: 'tpa',               label: 'TPA',                icon: Network,        desc: 'Accredit and certify individuals or institutions based on specific… standards', maps: 'ssc' },
  { id: 'institutional',     label: 'Institutional Partner', icon: Users,       desc: 'Accredit and certify individuals or institutions based on specific…',           maps: 'training_partner' },
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
      {/* Fake browser-tab + SIDH chrome header */}
      <div className="bg-[#0A2540] text-white">
        <div style={{ background: 'linear-gradient(to right, #FF9933 33%, #FFFFFF 33% 66%, #138808 66%)', height: 4 }} />
        <div className="px-6 py-3 flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 rounded hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded bg-white text-[#0A2540] flex items-center justify-center font-bold text-sm">SI</div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Ministry of Skill Development &amp; Entrepreneurship</div>
            <div className="text-[14px] font-semibold">Skill India Digital Hub · SIDH</div>
          </div>
          <div className="text-[11px] opacity-80 hidden md:block">sidh.nsdc.in</div>
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
          National Skill Development Corporation.
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
                style={{ borderColor: hover === p.id ? '#386AF6' : '#E8EDF5', background: '#fff', minHeight: 200 }}>
                <span className="absolute top-3 right-3 text-txt-tertiary hover:text-primary"><Info className="w-4 h-4" /></span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ background: hover === p.id ? '#EEF3FF' : '#F4F6FA' }}>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-[15px] font-bold text-txt-primary">{p.label}</div>
                <p className="text-[12px] text-txt-secondary leading-snug mt-1.5 line-clamp-4">{p.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: '#F26B22' }}>
                  Register <span>→</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-bdr-light bg-[#F4F6FA] px-4 py-3 text-[12px] text-txt-secondary">
          <b className="text-txt-primary">Don't see your role?</b> Trainees, employers, NSDC officers, funders, and stipend
          payment officers should use phone OTP instead. <button onClick={() => navigate('login')} className="text-primary font-bold ml-1">← Back to login</button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0A2540] text-white text-center py-3 text-[11px] opacity-90">
        © Skill India Digital Hub · A Government of India initiative · NSDC · MSDE
      </div>
    </div>
  )
}
