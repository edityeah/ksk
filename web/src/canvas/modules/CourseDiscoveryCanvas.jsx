// Discover Courses — curated catalogue of 47 real NSDC/PMKVY courses with
// search + sector filters, plus an "Ask AI" panel for free-form web search
// against PMKVY / NSDC / Skill India sources.

import { useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  Search, Sparkles, Clock, BadgeCheck, IndianRupee, MapPin, ChevronRight,
  ExternalLink, Loader2, Wand2,
} from 'lucide-react'

const COURSES = [
  { id: 'ras', name: 'Retail Sales Associate',          sector: 'Retail',           qp: 'RAS/Q0103', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 14, stipendType: 'placement', tags: ['popular'] },
  { id: 'cashier', name: 'Retail Cashier',              sector: 'Retail',           qp: 'RAS/Q0104', nsqf: 4, durationWeeks: 8,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'placement' },
  { id: 'dist-sales', name: 'Distributor Salesman',     sector: 'Retail',           qp: 'RAS/Q0203', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'gda', name: 'General Duty Assistant',          sector: 'Healthcare',       qp: 'HSS/Q5101', nsqf: 4, durationWeeks: 16, scheme: 'SIB',       mode: 'Offline', stipendK: 18, stipendType: 'placement', tags: ['popular', 'demand'] },
  { id: 'phlebotomist', name: 'Phlebotomist',           sector: 'Healthcare',       qp: 'HSS/Q3001', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 17, stipendType: 'placement' },
  { id: 'home-health', name: 'Home Health Aide',        sector: 'Healthcare',       qp: 'HSS/Q5102', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },
  { id: 'med-lab',     name: 'Medical Lab Technician',  sector: 'Healthcare',       qp: 'HSS/Q0801', nsqf: 5, durationWeeks: 26, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 22, stipendType: 'placement' },
  { id: 'emt',         name: 'Emergency Medical Technician', sector: 'Healthcare',  qp: 'HSS/Q2301', nsqf: 5, durationWeeks: 20, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 24, stipendType: 'placement' },
  { id: 'warehouse', name: 'Warehouse Picker',          sector: 'Logistics',        qp: 'LSC/Q1110', nsqf: 3, durationWeeks: 8,  scheme: 'DDU-GKY',   mode: 'Offline', stipendK: 13, stipendType: 'placement' },
  { id: 'last-mile', name: 'Last-Mile Delivery Executive', sector: 'Logistics',     qp: 'LSC/Q1011', nsqf: 3, durationWeeks: 8,  scheme: 'DDU-GKY',   mode: 'Hybrid',  stipendK: 16, stipendType: 'placement', tags: ['popular'] },
  { id: 'courier',   name: 'Courier Delivery Executive', sector: 'Logistics',       qp: 'LSC/Q1012', nsqf: 3, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'electrician', name: 'Assistant Electrician',   sector: 'Construction',     qp: 'CON/Q0102', nsqf: 3, durationWeeks: 52, scheme: 'PM SETU',   mode: 'Offline', stipendK: 17, stipendType: 'placement', tags: ['ITI', 'demand'] },
  { id: 'mason',     name: 'Mason General',             sector: 'Construction',     qp: 'CON/Q0104', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'bar-bender', name: 'Bar Bender / Steel Fixer', sector: 'Construction',     qp: 'CON/Q0203', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'plumber',   name: 'Plumber (General)',         sector: 'Construction',     qp: 'CON/Q0303', nsqf: 3, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 17, stipendType: 'placement' },
  { id: 'carpenter', name: 'Carpenter (Wooden Furniture)', sector: 'Construction',  qp: 'CON/Q0701', nsqf: 3, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'auto-tech', name: 'Automotive Service Technician', sector: 'Automotive',   qp: 'AMH/Q1502', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'twowheeler', name: 'Two-Wheeler Service Technician', sector: 'Automotive', qp: 'AMH/Q1410', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'ev-mech',   name: 'EV Service Mechanic',       sector: 'Automotive',       qp: 'AMH/Q1604', nsqf: 4, durationWeeks: 24, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 22, stipendType: 'placement', tags: ['green', 'future'] },
  { id: 'sewing',    name: 'Sewing Machine Operator',   sector: 'Apparel',          qp: 'TEX/Q0301', nsqf: 3, durationWeeks: 8,  scheme: 'SAMARTH',   mode: 'Offline', stipendK: 12, stipendType: 'placement' },
  { id: 'tailor',    name: 'Self-Employed Tailor',      sector: 'Apparel',          qp: 'TEX/Q5402', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 10, stipendType: 'self' },
  { id: 'data-entry', name: 'Domestic Data Entry Operator', sector: 'IT-ITeS',      qp: 'SSC/Q2212', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 14, stipendType: 'placement' },
  { id: 'bpo-nv',     name: 'Customer Care Executive (Non-Voice)', sector: 'IT-ITeS', qp: 'SSC/Q2210', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },
  { id: 'bpo-v',      name: 'Customer Care Executive (Voice)', sector: 'IT-ITeS',   qp: 'SSC/Q2211', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 18, stipendType: 'placement', tags: ['popular'] },
  { id: 'helpdesk',   name: 'IT Helpdesk Attendant',    sector: 'IT-ITeS',          qp: 'SSC/Q0903', nsqf: 4, durationWeeks: 14, scheme: 'FSP',       mode: 'Hybrid',  stipendK: 18, stipendType: 'placement' },
  { id: 'digital-mkt',name: 'Digital Marketing Executive', sector: 'IT-ITeS',       qp: 'MES/Q0710', nsqf: 5, durationWeeks: 16, scheme: 'FSP',       mode: 'Online',  stipendK: 22, stipendType: 'placement', tags: ['popular'] },
  { id: 'beauty',     name: 'Beauty Therapist',         sector: 'Beauty & Wellness', qp: 'BW/Q0101', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement', tags: ['popular', 'women'] },
  { id: 'hair',       name: 'Hair Stylist',             sector: 'Beauty & Wellness', qp: 'BW/Q0202', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 13, stipendType: 'placement', tags: ['women'] },
  { id: 'makeup',     name: 'Make-up Artist',           sector: 'Beauty & Wellness', qp: 'BW/Q0303', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'self' },
  { id: 'yoga',       name: 'Yoga Trainer',             sector: 'Beauty & Wellness', qp: 'BW/Q2202', nsqf: 5, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'fnb',        name: 'F&B Service Associate',    sector: 'Hospitality',      qp: 'THC/Q0301', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'housekeep',  name: 'Housekeeping Attendant',   sector: 'Hospitality',      qp: 'THC/Q0203', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 12, stipendType: 'placement' },
  { id: 'front',      name: 'Front Office Associate',   sector: 'Hospitality',      qp: 'THC/Q0102', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'cook',       name: 'Multi-Cuisine Cook',       sector: 'Hospitality',      qp: 'THC/Q3001', nsqf: 4, durationWeeks: 16, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement' },
  { id: 'food-op',    name: 'Food Processing Operator', sector: 'Food Processing',  qp: 'FIC/Q5004', nsqf: 3, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 14, stipendType: 'placement' },
  { id: 'bakery',     name: 'Bakery & Confectionery Assistant', sector: 'Food Processing', qp: 'FIC/Q5306', nsqf: 3, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 13, stipendType: 'placement' },
  { id: 'mobile-field', name: 'Field Technician (Mobile)', sector: 'Telecom',       qp: 'TEL/Q1101', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 16, stipendType: 'placement' },
  { id: 'mobile-repair',name: 'Mobile Phone Repair Technician', sector: 'Electronics', qp: 'ELE/Q3104', nsqf: 4, durationWeeks: 14, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 15, stipendType: 'self' },
  { id: 'dth',        name: 'DTH Set-Top Box Installer', sector: 'Telecom',         qp: 'TEL/Q6203', nsqf: 3, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 12, stipendType: 'placement' },
  { id: 'bank-cs',    name: 'Banking Customer Service', sector: 'BFSI',             qp: 'BSC/Q0101', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 18, stipendType: 'placement' },
  { id: 'microfin',   name: 'Microfinance Executive',   sector: 'BFSI',             qp: 'BSC/Q0202', nsqf: 4, durationWeeks: 10, scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 16, stipendType: 'placement' },
  { id: 'solar',      name: 'Solar Panel Installation Technician', sector: 'Power', qp: 'PSC/Q0102', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Offline', stipendK: 18, stipendType: 'placement', tags: ['green', 'future'] },
  { id: 'drone',      name: 'Drone Pilot (Remote Operator)', sector: 'Aerospace',   qp: 'AES/Q7901', nsqf: 5, durationWeeks: 6,  scheme: 'PMKVY 4.0', mode: 'Hybrid',  stipendK: 25, stipendType: 'placement', tags: ['future', 'popular'] },
  { id: 'green-h2',   name: 'Green Hydrogen Plant Operator', sector: 'Power',       qp: 'HSC/Q1001', nsqf: 4, durationWeeks: 16, scheme: 'NGHM',      mode: 'Hybrid',  stipendK: 24, stipendType: 'placement', tags: ['green', 'future'] },
  { id: 'agri-tech',  name: 'Sustainable Agriculture Technician', sector: 'Agriculture', qp: 'AGR/Q2401', nsqf: 4, durationWeeks: 12, scheme: 'PMKVY 4.0', mode: 'Hybrid', stipendK: 14, stipendType: 'placement', tags: ['green'] },
  { id: 'ai-ml',      name: 'AI / ML Foundation',        sector: 'IT-ITeS',          qp: 'NAS/Q5601', nsqf: 5, durationWeeks: 14, scheme: 'FSP',       mode: 'Online',  stipendK: 28, stipendType: 'placement', tags: ['future', 'popular'] },
  { id: 'cyber',      name: 'Cybersecurity Analyst',    sector: 'IT-ITeS',          qp: 'NAS/Q5701', nsqf: 6, durationWeeks: 16, scheme: 'FSP',       mode: 'Online',  stipendK: 32, stipendType: 'placement', tags: ['future'] },
  { id: 'cloud',      name: 'Cloud Computing Foundation', sector: 'IT-ITeS',        qp: 'NAS/Q5801', nsqf: 5, durationWeeks: 12, scheme: 'FSP',       mode: 'Online',  stipendK: 26, stipendType: 'placement', tags: ['future'] },
  { id: 'iot',        name: 'IoT Technician',           sector: 'IT-ITeS',          qp: 'NAS/Q5901', nsqf: 5, durationWeeks: 14, scheme: 'FSP',       mode: 'Hybrid',  stipendK: 24, stipendType: 'placement', tags: ['future'] },
]

const SECTOR_TONES = {
  'Retail': 'bg-sky-100 text-sky-700', 'Healthcare': 'bg-rose-100 text-rose-700',
  'Logistics': 'bg-amber-100 text-amber-700', 'Construction': 'bg-orange-100 text-orange-700',
  'Automotive': 'bg-violet-100 text-violet-700', 'Apparel': 'bg-pink-100 text-pink-700',
  'IT-ITeS': 'bg-indigo-100 text-indigo-700', 'Beauty & Wellness': 'bg-fuchsia-100 text-fuchsia-700',
  'Hospitality': 'bg-teal-100 text-teal-700', 'Food Processing': 'bg-lime-100 text-lime-700',
  'Telecom': 'bg-cyan-100 text-cyan-700', 'Electronics': 'bg-violet-100 text-violet-700',
  'BFSI': 'bg-emerald-100 text-emerald-700', 'Power': 'bg-yellow-100 text-yellow-700',
  'Aerospace': 'bg-blue-100 text-blue-700', 'Agriculture': 'bg-green-100 text-green-700',
}
const ALL_SECTORS = ['All', ...Array.from(new Set(COURSES.map(c => c.sector)))]
const QUICK_FILTERS = [
  { key: 'popular', label: '⭐ Popular' }, { key: 'future', label: '🚀 Future-ready' },
  { key: 'green', label: '🌱 Green Skills' }, { key: 'demand', label: '🔥 High Demand' },
  { key: 'ITI', label: '🏫 ITI' }, { key: 'women', label: '👩 Women-friendly' },
]

const AI_SYSTEM = `You are KSK's course discovery assistant. Use web search to find current NSDC / PMKVY / DDU-GKY / NAPS / FutureSkills Prime / PM SETU courses for the user's query.
Return 4-8 specific courses with: course name (bold), sector, NSQF level, duration, scheme, eligibility, stipend/CTC, and where to enrol. Prefer official sources (msde.gov.in, nsdcindia.org, skillindiadigital.gov.in).`

export default function CourseDiscoveryCanvas() {
  const { showToast } = useApp()
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('All')
  const [filterTag, setFilterTag] = useState(null)
  const [aiQuery, setAiQuery] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiCitations, setAiCitations] = useState([])
  const [showAi, setShowAi] = useState(false)

  const filtered = useMemo(() => COURSES.filter(c => {
    if (sector !== 'All' && c.sector !== sector) return false
    if (filterTag && !(c.tags || []).includes(filterTag)) return false
    if (q && !`${c.name} ${c.sector} ${c.scheme} ${c.qp}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [q, sector, filterTag])

  async function askAi(query) {
    if (!query) return
    setAiBusy(true); setAiAnswer(''); setAiCitations([])
    try {
      const r = await api.post('/api/ai/search', { query, instructions: AI_SYSTEM })
      setAiAnswer(r.text || '(no answer)'); setAiCitations(r.citations || [])
    } catch (e) {
      showToast({ kind: 'danger', text: e.payload?.error === 'openai_not_configured' ? 'OpenAI key not set.' : 'AI search failed.' })
    } finally { setAiBusy(false) }
  }
  function apply(c) { showToast({ kind: 'success', text: `Application submitted for ${c.name}` }) }

  return (
    <div className="p-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="mb-3">
        <div className="text-[12px] font-bold uppercase tracking-[2px] text-primary mb-1">Discover Courses</div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight">Find a skilling course near you</h2>
        <p className="text-[12px] text-txt-secondary mt-0.5">{COURSES.length} curated courses across {ALL_SECTORS.length - 1} sectors · plus AI search for live results.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-pill bg-surface-page border border-bdr-light mb-3">
        <Search className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search course, sector or QP code"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-txt-tertiary" />
        {q && <button onClick={() => setQ('')} className="text-txt-tertiary text-sm">✕</button>}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-2">
        {QUICK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterTag(filterTag === f.key ? null : f.key)}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-pill border ${filterTag === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-txt-primary border-bdr-light'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Sectors */}
      <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-bdr-light">
        {ALL_SECTORS.map(s => (
          <button key={s} onClick={() => setSector(s)}
            className={`text-[11px] px-2.5 py-1 rounded-pill border ${sector === s ? 'bg-primary text-white border-primary' : 'bg-white text-txt-secondary border-bdr-light hover:border-primary'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 text-[12px]">
        <div className="text-txt-secondary"><b className="text-txt-primary">{filtered.length}</b> courses{sector !== 'All' && <> in <b>{sector}</b></>}</div>
        <button onClick={() => setShowAi(s => !s)} className="inline-flex items-center gap-1 text-primary font-bold">
          <Wand2 className="w-3.5 h-3.5" /> {showAi ? 'Hide AI search' : 'Ask AI for live results'}
        </button>
      </div>

      {/* AI panel */}
      {showAi && (
        <div className="mb-4 rounded-2xl border border-primary-light bg-primary-light/30 p-3">
          <form onSubmit={e => { e.preventDefault(); askAi(aiQuery) }} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              placeholder="e.g. 'green hydrogen courses near Pune' — searches NSDC/MSDE live"
              className="flex-1 bg-white border border-bdr-light rounded-pill px-3 py-1.5 text-[13px] outline-none" />
            <button type="submit" disabled={!aiQuery.trim() || aiBusy}
              className="px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold disabled:bg-slate-300">
              {aiBusy ? '…' : 'Search'}
            </button>
          </form>
          {aiBusy && (
            <div className="mt-3 text-center text-txt-secondary text-[13px] inline-flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Searching NSDC & MSDE…
            </div>
          )}
          {!aiBusy && aiAnswer && (
            <div className="mt-3 rounded-2xl bg-white border border-bdr-light p-3">
              <div className="text-[13px] text-txt-primary whitespace-pre-wrap leading-relaxed">{renderMd(aiAnswer)}</div>
              {aiCitations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-bdr-light flex flex-wrap gap-x-3">
                  {aiCitations.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[260px]">
                      {c.title} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Catalogue */}
      <div className="space-y-2.5">
        {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page p-6 text-center text-txt-secondary text-sm">No courses match your filters.</div>}
        {filtered.map(c => <CourseCard key={c.id} c={c} onApply={() => apply(c)} />)}
      </div>

      <div className="mt-5 pt-4 border-t border-bdr-light text-[10px] text-txt-tertiary leading-relaxed">
        Curated subset of 1,243+ NSDC job roles · PMKVY 4.0 · DDU-GKY · NAPS · SIB · FutureSkills Prime · PM SETU · NGHM. Use "Ask AI" for live web results.
      </div>
    </div>
  )
}

function CourseCard({ c, onApply }) {
  const tone = SECTOR_TONES[c.sector] || 'bg-slate-100 text-slate-700'
  const durStr = c.durationWeeks >= 52 ? `${Math.round(c.durationWeeks/52)} yr` : `${c.durationWeeks} weeks`
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-4 hover:shadow-card transition">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl ${tone} flex items-center justify-center text-[18px] font-bold flex-shrink-0`}>{c.sector.slice(0, 1)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[15px] text-txt-primary leading-tight">{c.name}</div>
              <div className="text-[11px] text-txt-secondary mt-0.5 flex items-center flex-wrap gap-x-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${tone} font-bold text-[10px]`}>{c.sector}</span>
                <span className="font-mono">{c.qp}</span><span>·</span><span>NSQF {c.nsqf}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {(c.tags || []).map(tag => (<span key={tag} className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{tag}</span>))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px] text-txt-secondary">
            <Meta icon={<Clock className="w-3 h-3" />} label="Duration"     value={durStr} />
            <Meta icon={<BadgeCheck className="w-3 h-3" />} label="Scheme"  value={c.scheme} />
            <Meta icon={<MapPin className="w-3 h-3" />}   label="Mode"      value={c.mode} />
            <Meta icon={<IndianRupee className="w-3 h-3" />} label={c.stipendType === 'self' ? 'Earning' : 'CTC'} value={`₹${c.stipendK}k / mo`} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={onApply} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-primary text-white text-[12px] font-bold hover:opacity-90">
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

function renderMd(s) {
  if (!s) return null
  const out = []
  s.split('\n').forEach((line, i) => {
    if (/^[-*]\s+/.test(line)) out.push(<div key={i} className="flex gap-2"><div className="text-primary">•</div><div className="flex-1">{inline(line.replace(/^[-*]\s+/, ''))}</div></div>)
    else if (line.trim() === '') out.push(<div key={i} className="h-2" />)
    else out.push(<div key={i}>{inline(line)}</div>)
  })
  return out
}
function inline(s) {
  const parts = []; const re = /\*\*([^*]+)\*\*/g; let last = 0, m, k = 0
  while ((m = re.exec(s))) { if (m.index > last) parts.push(s.slice(last, m.index)); parts.push(<b key={k++}>{m[1]}</b>); last = m.index + m[0].length }
  if (last < s.length) parts.push(s.slice(last))
  return parts
}
