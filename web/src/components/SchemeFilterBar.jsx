// SchemeFilterBar — small horizontal chip bar that lets the NSDC officer
// scope the current dashboard by scheme. Selected scheme is reflected in
// the hero scope-line + injected into Saathi's extraSystem so analytic
// answers also scope themselves.
//
// Pattern: single-select. "All schemes" is the default.
//
// Drop into any analyst canvas:
//   const [scheme, setScheme] = useState('all')
//   <SchemeFilterBar value={scheme} onChange={setScheme} />

import { Sparkles, Coins } from 'lucide-react'

// Six headline schemes that show up across NSDC's tracking surface.
// Synonymous aliases (in human conversation) listed in `alias` so Saathi
// can match user intent (e.g. "pradhan mantri kaushal vikas" → PMKVY).
export const SCHEMES = [
  { key: 'all',           label: 'All schemes',     alias: ['all'] },
  { key: 'pmkvy',         label: 'PMKVY 4.0',       alias: ['Pradhan Mantri Kaushal Vikas Yojana'] },
  { key: 'ddu_gky',       label: 'DDU-GKY',         alias: ['Deendayal Antyodaya Yojana — Grameen Kaushalya Yojana'] },
  { key: 'naps',          label: 'NAPS',            alias: ['National Apprenticeship Promotion Scheme'] },
  { key: 'pm_vishwakarma',label: 'PM Vishwakarma',  alias: ['PM Vishwakarma Yojana'] },
  { key: 'sib',           label: 'SIB',             alias: ['Skill Impact Bond'] },
  { key: 'rpl',           label: 'RPL',             alias: ['Recognition of Prior Learning'] },
  { key: 'pmnap',         label: 'PMNAP',           alias: ['PM National Apprenticeship'] },
  { key: 'skill_hub',     label: 'Skill Hub',       alias: ['NEP-aligned Skill Hubs'] },
]

export function schemeLabel(key) {
  return (SCHEMES.find(s => s.key === key) || SCHEMES[0]).label
}

export default function SchemeFilterBar({ value = 'all', onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 ${className}`}>
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-txt-tertiary flex-shrink-0 mr-1">
        <Coins className="w-3 h-3" /> Scheme
      </span>
      {SCHEMES.map(s => (
        <button key={s.key} onClick={() => onChange?.(s.key)}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-pill border text-[11px] font-bold whitespace-nowrap transition ${
            value === s.key
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-txt-primary border-bdr hover:border-primary hover:text-primary'
          }`}>
          {value === s.key && <Sparkles className="w-3 h-3" />}
          {s.label}
        </button>
      ))}
    </div>
  )
}
