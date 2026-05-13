// FilterBar — always-visible row of filter pills for the Apprenticeships
// module. Each pill shows the active selection (or "All") and opens a small
// floating popover with options.
//
// Filter shape:
//   {
//     fy: 'all' | 'FY-18-19' | … | 'FY-26-27',
//     state: 'all' | <state-name>,
//     gender: Set<'male'|'female'|'transgender'>,      // empty = all
//     specialDistrict: Set<'aspirational'|'border'|'lwe'|'naxal'|'tribal'>,
//     contract: 'all' | 'designated' | 'optional',
//     estabType: Set<'central_gov'|'central_psu'|'co_op'|'private'|'state_gov'|'state_psu'>,
//   }
//
// Saathi at the bottom reads the same `filters` object and quotes them in
// every response so analyst questions are correctly scoped.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, MapPin, Users, Sparkles, FileText, Building2, X, ChevronDown, Filter, Check } from 'lucide-react'

export const FY_OPTIONS = ['FY-18-19','FY-19-20','FY-20-21','FY-21-22','FY-22-23','FY-23-24','FY-24-25','FY-25-26','FY-26-27']

export const STATE_OPTIONS = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu & Kashmir','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar','Chandigarh','Dadra & Nagar Haveli','Lakshadweep','Ladakh','Puducherry',
]

export const SPECIAL_DISTRICTS = [
  { key: 'aspirational', label: 'Aspirational districts',  desc: 'NITI Aayog flagship districts' },
  { key: 'border',       label: 'Border districts',         desc: 'Districts on international borders' },
  { key: 'lwe',          label: 'LWE districts',            desc: 'Left-Wing Extremism affected' },
  { key: 'naxal',        label: 'Naxal districts',          desc: 'Naxal-affected districts' },
  { key: 'tribal',       label: 'Tribal districts',         desc: 'Predominantly tribal districts' },
]

export const ESTAB_TYPES = [
  { key: 'central_gov', label: 'Central Government' },
  { key: 'central_psu', label: 'Central PSU' },
  { key: 'co_op',       label: 'Co-Operative' },
  { key: 'private',     label: 'Private Sector' },
  { key: 'state_gov',   label: 'State Government' },
  { key: 'state_psu',   label: 'State PSU' },
]

export function defaultFilters() {
  return {
    fy: 'all',
    state: 'all',
    gender: new Set(),
    specialDistrict: new Set(),
    contract: 'all',
    estabType: new Set(),
  }
}

// Quick check: are any filters actually active?
export function activeFilterCount(f) {
  let n = 0
  if (f.fy !== 'all') n++
  if (f.state !== 'all') n++
  if (f.gender.size > 0) n++
  if (f.specialDistrict.size > 0) n++
  if (f.contract !== 'all') n++
  if (f.estabType.size > 0) n++
  return n
}

// Compact summary string that Saathi can quote.
export function filtersSummary(f) {
  const parts = []
  if (f.fy !== 'all') parts.push(f.fy)
  if (f.state !== 'all') parts.push(f.state)
  if (f.gender.size > 0) parts.push([...f.gender].join('/'))
  if (f.specialDistrict.size > 0) parts.push([...f.specialDistrict].join(' + ') + ' districts')
  if (f.contract !== 'all') parts.push(f.contract + ' contracts')
  if (f.estabType.size > 0) parts.push([...f.estabType].join(' + ') + ' establishments')
  return parts.length === 0 ? 'all India · all years · all cohorts' : parts.join(' · ')
}

// ── Components ──

export default function FilterBar({ filters, setFilters, showEstabType = false }) {
  const reset = () => setFilters(defaultFilters())
  const active = activeFilterCount(filters)

  return (
    <div className="flex-shrink-0 px-4 py-2.5 bg-white border-b border-bdr flex items-center gap-2 overflow-x-auto">
      <Filter className="w-3.5 h-3.5 text-txt-tertiary flex-shrink-0" />
      <FYPill filters={filters} setFilters={setFilters} />
      <StatePill filters={filters} setFilters={setFilters} />
      <GenderPill filters={filters} setFilters={setFilters} />
      <SpecialDistrictPill filters={filters} setFilters={setFilters} />
      <ContractPill filters={filters} setFilters={setFilters} />
      {showEstabType && <EstabTypePill filters={filters} setFilters={setFilters} />}
      {active > 0 && (
        <button onClick={reset} className="ml-auto inline-flex items-center gap-1 text-[11px] text-rose-700 font-bold hover:bg-rose-50 px-2 py-1 rounded-pill flex-shrink-0">
          <X className="w-3 h-3" /> Clear ({active})
        </button>
      )}
    </div>
  )
}

// ── Generic pill with click-outside popover ──
// Popover is rendered through a React portal to document.body so it escapes
// any ancestor with overflow:hidden / overflow:scroll (which our filter bar
// itself uses for horizontal scrolling). We compute the anchor position via
// getBoundingClientRect on every open + window resize.
function Pill({ icon: Icon, label, active, onClear, children, popoverWidth = 240 }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)            // { top, left } in viewport coords
  const btnRef  = useRef(null)
  const popRef  = useRef(null)

  // Recompute popover position on open / resize / scroll.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    function recompute() {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      // Right-align if popover would otherwise spill off screen.
      const vw = window.innerWidth
      const wantLeft = r.left
      const willOverflow = wantLeft + popoverWidth > vw - 8
      const left = willOverflow ? Math.max(8, r.right - popoverWidth) : wantLeft
      setPos({ top: r.bottom + 4, left })
    }
    recompute()
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [open, popoverWidth])

  // Click-outside dismiss — must check both the button and the portaled popover.
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (btnRef.current?.contains(e.target)) return
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-pill border text-[11px] font-bold whitespace-nowrap transition flex-shrink-0 ${
          active
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-txt-primary border-bdr hover:border-primary hover:text-primary'
        }`}
      >
        <Icon className="w-3 h-3" />
        {label}
        {active && onClear && (
          <span onClick={(e) => { e.stopPropagation(); onClear() }} className="ml-0.5 inline-flex w-3 h-3 items-center justify-center rounded-full hover:bg-white/20">
            <X className="w-2.5 h-2.5" />
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          className="bg-white rounded-xl border border-bdr shadow-modal p-2 max-h-[320px] overflow-y-auto"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: popoverWidth,
            zIndex: 200,
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  )
}

function PopRow({ active, onClick, children, sub }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] flex items-center gap-2 transition ${
        active ? 'bg-primary-light/60 text-primary-dark font-bold' : 'text-txt-primary hover:bg-surface-page/60'
      }`}>
      {active && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="truncate">{children}</div>
        {sub && <div className="text-[10px] text-txt-tertiary truncate">{sub}</div>}
      </div>
    </button>
  )
}

function FYPill({ filters, setFilters }) {
  const active = filters.fy !== 'all'
  const label = active ? filters.fy : 'All FYs'
  return (
    <Pill icon={Calendar} label={label} active={active} onClear={() => setFilters({ ...filters, fy: 'all' })}>
      <PopRow active={filters.fy === 'all'} onClick={() => setFilters({ ...filters, fy: 'all' })}>All Financial Years</PopRow>
      {FY_OPTIONS.map(fy => (
        <PopRow key={fy} active={filters.fy === fy} onClick={() => setFilters({ ...filters, fy })}>{fy}</PopRow>
      ))}
    </Pill>
  )
}

function StatePill({ filters, setFilters }) {
  const [query, setQuery] = useState('')
  const active = filters.state !== 'all'
  const label = active ? filters.state : 'All states'
  const filtered = STATE_OPTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
  return (
    <Pill icon={MapPin} label={label} active={active} onClear={() => setFilters({ ...filters, state: 'all' })} popoverWidth={260}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search state…"
        className="w-full mb-1 px-2.5 py-1.5 text-[12px] border border-bdr-light rounded-lg outline-none focus:border-primary"
      />
      <PopRow active={filters.state === 'all'} onClick={() => setFilters({ ...filters, state: 'all' })}>All states</PopRow>
      {filtered.map(s => (
        <PopRow key={s} active={filters.state === s} onClick={() => setFilters({ ...filters, state: s })}>{s}</PopRow>
      ))}
    </Pill>
  )
}

function GenderPill({ filters, setFilters }) {
  const active = filters.gender.size > 0
  const label = active ? [...filters.gender].join('/') : 'All genders'
  function toggle(k) {
    const next = new Set(filters.gender)
    if (next.has(k)) next.delete(k); else next.add(k)
    setFilters({ ...filters, gender: next })
  }
  return (
    <Pill icon={Users} label={label} active={active} onClear={() => setFilters({ ...filters, gender: new Set() })}>
      {['male','female','transgender'].map(g => (
        <PopRow key={g} active={filters.gender.has(g)} onClick={() => toggle(g)}>{g.charAt(0).toUpperCase() + g.slice(1)}</PopRow>
      ))}
    </Pill>
  )
}

function SpecialDistrictPill({ filters, setFilters }) {
  const active = filters.specialDistrict.size > 0
  const label = active ? `${filters.specialDistrict.size} special` : 'Special district'
  function toggle(k) {
    const next = new Set(filters.specialDistrict)
    if (next.has(k)) next.delete(k); else next.add(k)
    setFilters({ ...filters, specialDistrict: next })
  }
  return (
    <Pill icon={Sparkles} label={label} active={active} onClear={() => setFilters({ ...filters, specialDistrict: new Set() })} popoverWidth={280}>
      {SPECIAL_DISTRICTS.map(sd => (
        <PopRow key={sd.key} active={filters.specialDistrict.has(sd.key)} onClick={() => toggle(sd.key)} sub={sd.desc}>{sd.label}</PopRow>
      ))}
    </Pill>
  )
}

function ContractPill({ filters, setFilters }) {
  const active = filters.contract !== 'all'
  const label = active ? filters.contract.charAt(0).toUpperCase() + filters.contract.slice(1) : 'All contracts'
  return (
    <Pill icon={FileText} label={label} active={active} onClear={() => setFilters({ ...filters, contract: 'all' })}>
      <PopRow active={filters.contract === 'all'}        onClick={() => setFilters({ ...filters, contract: 'all' })}>All</PopRow>
      <PopRow active={filters.contract === 'designated'} onClick={() => setFilters({ ...filters, contract: 'designated' })}>Designated</PopRow>
      <PopRow active={filters.contract === 'optional'}   onClick={() => setFilters({ ...filters, contract: 'optional' })}>Optional</PopRow>
    </Pill>
  )
}

function EstabTypePill({ filters, setFilters }) {
  const active = filters.estabType.size > 0
  const label = active ? `${filters.estabType.size} types` : 'Estab type'
  function toggle(k) {
    const next = new Set(filters.estabType)
    if (next.has(k)) next.delete(k); else next.add(k)
    setFilters({ ...filters, estabType: next })
  }
  return (
    <Pill icon={Building2} label={label} active={active} onClear={() => setFilters({ ...filters, estabType: new Set() })} popoverWidth={220}>
      {ESTAB_TYPES.map(et => (
        <PopRow key={et.key} active={filters.estabType.has(et.key)} onClick={() => toggle(et.key)}>{et.label}</PopRow>
      ))}
    </Pill>
  )
}
