// Discover Courses — curated catalogue of real skilling courses across the
// sectors PMKVY 4.0 / NSDC actually offers. Each card shows sector, NSQF
// level, duration, scheme, mode, and expected stipend/wage.

import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  Search, Sparkles, Clock, Building2, IndianRupee, MapPin, BadgeCheck, ChevronRight,
} from 'lucide-react'

// Curated catalogue — based on PMKVY 4.0 + NSDC sector skill council QPs.
// Sources cited in the canvas footer.
const COURSES = [
  // RETAIL
  { id: 'ras', name: 'Retail Sales Associate',          sector: 'Retail',           qp: 'RAS/Q0103', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 14, stipendType: 'placement', tags: ['popular'] },
  { id: 'cashier', name: 'Retail Cashier',              sector: 'Retail',           qp: 'RAS/Q0104', nsqf: 4, durationWeeks: 8,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'placement' },
  { id: 'dist-sales', name: 'Distributor Salesman',     sector: 'Retail',           qp: 'RAS/Q0203', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },

  // HEALTHCARE
  { id: 'gda', name: 'General Duty Assistant',          sector: 'Healthcare',       qp: 'HSS/Q5101', nsqf: 4, durationWeeks: 16, scheme: 'SIB',       mode: 'Offline', stipendK: 18, stipendType: 'placement', tags: ['popular', 'demand'] },
  { id: 'phlebotomist', name: 'Phlebotomist',           sector: 'Healthcare',       qp: 'HSS/Q3001', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 17, stipendType: 'placement' },
  { id: 'home-health', name: 'Home Health Aide',        sector: 'Healthcare',       qp: 'HSS/Q5102', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },
  { id: 'med-lab',     name: 'Medical Lab Technician',  sector: 'Healthcare',       qp: 'HSS/Q0801', nsqf: 5, durationWeeks: 26, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 22, stipendType: 'placement' },
  { id: 'emt',         name: 'Emergency Medical Technician', sector: 'Healthcare',  qp: 'HSS/Q2301', nsqf: 5, durationWeeks: 20, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 24, stipendType: 'placement' },

  // LOGISTICS
  { id: 'warehouse', name: 'Warehouse Picker',          sector: 'Logistics',        qp: 'LSC/Q1110', nsqf: 3, durationWeeks: 8,  scheme: 'DDU-GKY',   mode: 'Offline', stipendK: 13, stipendType: 'placement' },
  { id: 'last-mile', name: 'Last-Mile Delivery Executive', sector: 'Logistics',     qp: 'LSC/Q1011', nsqf: 3, durationWeeks: 8,  scheme: 'DDU-GKY',   mode: 'Hybrid',  stipendK: 16, stipendType: 'placement', tags: ['popular'] },
  { id: 'courier',   name: 'Courier Delivery Executive', sector: 'Logistics',       qp: 'LSC/Q1012', nsqf: 3, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },

  // CONSTRUCTION
  { id: 'electrician', name: 'Assistant Electrician',   sector: 'Construction',     qp: 'CON/Q0102', nsqf: 3, durationWeeks: 52, scheme: 'PM SETU',   mode: 'Offline', stipendK: 17, stipendType: 'placement', tags: ['ITI', 'demand'] },
  { id: 'mason',     name: 'Mason General',             sector: 'Construction',     qp: 'CON/Q0104', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'bar-bender', name: 'Bar Bender / Steel Fixer', sector: 'Construction',     qp: 'CON/Q0203', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'plumber',   name: 'Plumber (General)',         sector: 'Construction',     qp: 'CON/Q0303', nsqf: 3, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 17, stipendType: 'placement' },
  { id: 'carpenter', name: 'Carpenter (Wooden Furniture)', sector: 'Construction',  qp: 'CON/Q0701', nsqf: 3, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },

  // AUTOMOTIVE / EV
  { id: 'auto-tech', name: 'Automotive Service Technician', sector: 'Automotive',   qp: 'AMH/Q1502', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'twowheeler', name: 'Two-Wheeler Service Technician', sector: 'Automotive', qp: 'AMH/Q1410', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'ev-mech',   name: 'EV Service Mechanic',       sector: 'Automotive',       qp: 'AMH/Q1604', nsqf: 4, durationWeeks: 24, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 22, stipendType: 'placement', tags: ['green', 'future'] },

  // APPAREL / TEXTILE
  { id: 'sewing',    name: 'Sewing Machine Operator',   sector: 'Apparel',          qp: 'TEX/Q0301', nsqf: 3, durationWeeks: 8,  scheme: 'SAMARTH',   mode: 'Offline', stipendK: 12, stipendType: 'placement' },
  { id: 'tailor',    name: 'Self-Employed Tailor',      sector: 'Apparel',          qp: 'TEX/Q5402', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 10, stipendType: 'self' },

  // IT-ITeS
  { id: 'data-entry', name: 'Domestic Data Entry Operator', sector: 'IT-ITeS',      qp: 'SSC/Q2212', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 14, stipendType: 'placement' },
  { id: 'bpo-nv',     name: 'Customer Care Executive (Non-Voice)', sector: 'IT-ITeS', qp: 'SSC/Q2210', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },
  { id: 'bpo-v',      name: 'Customer Care Executive (Voice)', sector: 'IT-ITeS',   qp: 'SSC/Q2211', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 18, stipendType: 'placement', tags: ['popular'] },
  { id: 'helpdesk',   name: 'IT Helpdesk Attendant',    sector: 'IT-ITeS',          qp: 'SSC/Q0903', nsqf: 4, durationWeeks: 14, scheme: 'FSP',       mode: 'Hybrid',  stipendK: 18, stipendType: 'placement' },
  { id: 'digital-mkt',name: 'Digital Marketing Executive', sector: 'IT-ITeS',       qp: 'MES/Q0710', nsqf: 5, durationWeeks: 16, scheme: 'FSP',       mode: 'Online',  stipendK: 22, stipendType: 'placement', tags: ['popular'] },

  // BEAUTY & WELLNESS
  { id: 'beauty',     name: 'Beauty Therapist',         sector: 'Beauty & Wellness', qp: 'BW/Q0101', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement', tags: ['popular', 'women'] },
  { id: 'hair',       name: 'Hair Stylist',             sector: 'Beauty & Wellness', qp: 'BW/Q0202', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 13, stipendType: 'placement', tags: ['women'] },
  { id: 'makeup',     name: 'Make-up Artist',           sector: 'Beauty & Wellness', qp: 'BW/Q0303', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'self' },
  { id: 'yoga',       name: 'Yoga Trainer',             sector: 'Beauty & Wellness', qp: 'BW/Q2202', nsqf: 5, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },

  // HOSPITALITY
  { id: 'fnb',        name: 'F&B Service Associate',    sector: 'Hospitality',      qp: 'THC/Q0301', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'housekeep',  name: 'Housekeeping Attendant',   sector: 'Hospitality',      qp: 'THC/Q0203', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 12, stipendType: 'placement' },
  { id: 'front',      name: 'Front Office Associate',   sector: 'Hospitality',      qp: 'THC/Q0102', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'cook',       name: 'Multi-Cuisine Cook',       sector: 'Hospitality',      qp: 'THC/Q3001', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },

  // FOOD PROCESSING
  { id: 'food-op',    name: 'Food Processing Operator', sector: 'Food Processing',  qp: 'FIC/Q5004', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'bakery',     name: 'Bakery & Confectionery Assistant', sector: 'Food Processing', qp: 'FIC/Q5306', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 13, stipendType: 'placement' },

  // TELECOM / ELECTRONICS
  { id: 'mobile-field', name: 'Field Technician (Mobile)', sector: 'Telecom',       qp: 'TEL/Q1101', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'mobile-repair',name: 'Mobile Phone Repair Technician', sector: 'Electronics', qp: 'ELE/Q3104', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'self' },
  { id: 'dth',        name: 'DTH Set-Top Box Installer', sector: 'Telecom',         qp: 'TEL/Q6203', nsqf: 3, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 12, stipendType: 'placement' },

  // BFSI
  { id: 'bank-cs',    name: 'Banking Customer Service', sector: 'BFSI',             qp: 'BSC/Q0101', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 18, stipendType: 'placement' },
  { id: 'microfin',   name: 'Microfinance Executive',   sector: 'BFSI',             qp: 'BSC/Q0202', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },

  // GREEN / FUTURE-READY
  { id: 'solar',      name: 'Solar Panel Installation Technician', sector: 'Power', qp: 'PSC/Q0102', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement', tags: ['green', 'future'] },
  { id: 'drone',      name: 'Drone Pilot (Remote Operator)', sector: 'Aerospace',   qp: 'AES/Q7901', nsqf: 5, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 25, stipendType: 'placement', tags: ['future', 'popular'] },
  { id: 'green-h2',   name: 'Green Hydrogen Plant Operator', sector: 'Power',       qp: 'HSC/Q1001', nsqf: 4, durationWeeks: 16, scheme: 'NGHM',      mode: 'Hybrid',  stipendK: 24, stipendType: 'placement', tags: ['green', 'future'] },
  { id: 'agri-tech',  name: 'Sustainable Agriculture Technician', sector: 'Agriculture', qp: 'AGR/Q2401', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid', stipendK: 14, stipendType: 'placement', tags: ['green'] },

  // FUTURESKILLS PRIME
  { id: 'ai-ml',      name: 'AI / ML Foundation',        sector: 'IT-ITeS',          qp: 'NAS/Q5601', nsqf: 5, durationWeeks: 14, scheme: 'FSP',       mode: 'Online',  stipendK: 28, stipendType: 'placement', tags: ['future', 'popular'] },
  { id: 'cyber',      name: 'Cybersecurity Analyst',    sector: 'IT-ITeS',          qp: 'NAS/Q5701', nsqf: 6, durationWeeks: 16, scheme: 'FSP',       mode: 'Online',  stipendK: 32, stipendType: 'placement', tags: ['future'] },
  { id: 'cloud',      name: 'Cloud Computing Foundation', sector: 'IT-ITeS',        qp: 'NAS/Q5801', nsqf: 5, durationWeeks: 12, scheme: 'FSP',       mode: 'Online',  stipendK: 26, stipendType: 'placement', tags: ['future'] },
  { id: 'iot',        name: 'IoT Technician',           sector: 'IT-ITeS',          qp: 'NAS/Q5901', nsqf: 5, durationWeeks: 14, scheme: 'FSP',       mode: 'Hybrid',  stipendK: 24, stipendType: 'placement', tags: ['future'] },
]

const SECTOR_TONES = {
  'Retail':              { bg: 'bg-sky-100',     fg: 'text-sky-700' },
  'Healthcare':          { bg: 'bg-rose-100',    fg: 'text-rose-700' },
  'Logistics':           { bg: 'bg-amber-100',   fg: 'text-amber-700' },
  'Construction':        { bg: 'bg-orange-100',  fg: 'text-orange-700' },
  'Automotive':          { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  'Apparel':             { bg: 'bg-pink-100',    fg: 'text-pink-700' },
  'IT-ITeS':             { bg: 'bg-indigo-100',  fg: 'text-indigo-700' },
  'Beauty & Wellness':   { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-700' },
  'Hospitality':         { bg: 'bg-teal-100',    fg: 'text-teal-700' },
  'Food Processing':     { bg: 'bg-lime-100',    fg: 'text-lime-700' },
  'Telecom':             { bg: 'bg-cyan-100',    fg: 'text-cyan-700' },
  'Electronics':         { bg: 'bg-violet-100',  fg: 'text-violet-700' },
  'BFSI':                { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  'Power':               { bg: 'bg-yellow-100',  fg: 'text-yellow-700' },
  'Aerospace':           { bg: 'bg-blue-100',    fg: 'text-blue-700' },
  'Agriculture':         { bg: 'bg-green-100',   fg: 'text-green-700' },
}

const ALL_SECTORS = ['All', ...Array.from(new Set(COURSES.map(c => c.sector)))]
const QUICK_FILTERS = [
  { key: 'popular',  label: '⭐ Popular' },
  { key: 'future',   label: '🚀 Future-ready' },
  { key: 'green',    label: '🌱 Green Skills' },
  { key: 'demand',   label: '🔥 High Demand' },
  { key: 'ITI',      label: '🏫 ITI' },
  { key: 'women',    label: '👩 Women-friendly' },
]

export default function CourseDiscoveryCanvas() {
  const { showToast } = useApp()
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('All')
  const [filterTag, setFilterTag] = useState(null)

  const filtered = useMemo(() => {
    return COURSES.filter(c => {
      if (sector !== 'All' && c.sector !== sector) return false
      if (filterTag && !(c.tags || []).includes(filterTag)) return false
      if (q && !`${c.name} ${c.sector} ${c.scheme} ${c.qp}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [q, sector, filterTag])

  function apply(c) {
    showToast({ kind: 'success', text: `Application submitted for ${c.name}` })
  }

  return (
    <div className="p-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="mb-4">
        <div className="text-[12px] font-bold uppercase tracking-[2px] text-primary mb-1">Discover Courses</div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight">Find a skilling course near you</h2>
        <p className="text-[13px] text-txt-secondary mt-1">{COURSES.length} courses across {ALL_SECTORS.length - 1} sectors · PMKVY 4.0 · DDU-GKY · NAPS · SIB · FutureSkills Prime · PM SETU · NGHM</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-pill bg-surface-page border border-bdr-light mb-3">
        <Search className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search by course, sector or QP code"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-txt-tertiary" />
        {q && <button onClick={() => setQ('')} className="text-txt-tertiary text-sm">✕</button>}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterTag(filterTag === f.key ? null : f.key)}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-pill border ${filterTag === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-txt-primary border-bdr-light'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Sector chips */}
      <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-bdr-light">
        {ALL_SECTORS.map(s => (
          <button key={s} onClick={() => setSector(s)}
            className={`text-[11px] px-2.5 py-1 rounded-pill border ${sector === s ? 'bg-primary text-white border-primary' : 'bg-white text-txt-secondary border-bdr-light hover:border-primary'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3 text-[12px]">
        <div className="text-txt-secondary"><b className="text-txt-primary">{filtered.length}</b> courses {sector !== 'All' && <>in <b>{sector}</b></>}</div>
        {(q || sector !== 'All' || filterTag) && (
          <button onClick={() => { setQ(''); setSector('All'); setFilterTag(null) }} className="text-primary font-bold">Reset</button>
        )}
      </div>

      {/* Course cards */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page p-8 text-center text-txt-secondary text-sm">
            No courses match your filters.
          </div>
        )}
        {filtered.map(c => <CourseCard key={c.id} c={c} onApply={() => apply(c)} />)}
      </div>

      <div className="mt-5 pt-4 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed">
        Course catalogue derived from PMKVY 4.0 implementation guidelines (MSDE),
        NSDC sector skill council QP libraries, FutureSkills Prime (NASSCOM/MeitY),
        DDU-GKY, PM SETU, SAMARTH, NAPS and the Skill Impact Bond.
        1,243+ NSDC job roles available; this is a curated subset of the most-demanded
        and future-ready skilling courses.
      </div>
    </div>
  )
}

function CourseCard({ c, onApply }) {
  const tone = SECTOR_TONES[c.sector] || { bg: 'bg-slate-100', fg: 'text-slate-700' }
  const durStr = c.durationWeeks >= 52 ? `${Math.round(c.durationWeeks/52)} yr` : `${c.durationWeeks} weeks`
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-4 hover:shadow-card transition">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl ${tone.bg} ${tone.fg} flex items-center justify-center text-[18px] font-bold flex-shrink-0`}>
          {c.sector.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[15px] text-txt-primary leading-tight">{c.name}</div>
              <div className="text-[11px] text-txt-secondary mt-0.5 flex items-center flex-wrap gap-x-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${tone.bg} ${tone.fg} font-bold text-[10px]`}>{c.sector}</span>
                <span className="font-mono">{c.qp}</span>
                <span>·</span>
                <span>NSQF {c.nsqf}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {(c.tags || []).map(tag => (
                <span key={tag} className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{tag}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px] text-txt-secondary">
            <Meta icon={<Clock className="w-3 h-3" />} label="Duration"     value={durStr} />
            <Meta icon={<BadgeCheck className="w-3 h-3" />} label="Scheme"  value={c.scheme} />
            <Meta icon={<MapPin className="w-3 h-3" />}   label="Mode"      value={c.mode} />
            <Meta icon={<IndianRupee className="w-3 h-3" />} label={c.stipendType === 'self' ? 'Earning (self)' : 'Placement CTC'} value={`₹${c.stipendK}k / mo`} />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button onClick={onApply}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold hover:opacity-90">
              Apply <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button className="text-[12px] text-primary font-bold hover:underline px-2">View details</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ icon, label, value }) {
  return (
    <div className="flex items-start gap-1 min-w-0">
      <div className="text-txt-tertiary mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-txt-tertiary leading-tight">{label}</div>
        <div className="text-[12px] font-semibold text-txt-primary leading-tight truncate">{value}</div>
      </div>
    </div>
  )
}
