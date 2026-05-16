// TP HQ drilldown page — replaces the dashboard inside the Saathi split when
// a KPI tile is clicked on the Demand Master. Provides three pivots over the
// same underlying data: by Training Centre, by Role / Track, by MoU.
//
// Entry from a KPI sets the highlighted "metric" (committed / allocated /
// confirmed / confirmation-gap). The user can flip pivots inside the page.

import { useMemo, useState } from 'react'
import {
  ChevronLeft, ChevronDown, ChevronRight, Building2, Briefcase, FileSignature,
  Layers, CheckCircle2, AlertTriangle, Clock, X,
} from 'lucide-react'
import {
  getAllMous, CENTRES, computeCentreSummary, ratioBand,
  getPlannedTotal,
} from './data.js'

const PIVOTS = [
  { id: 'centre', label: 'By Training Centre', icon: Building2 },
  { id: 'role',   label: 'By Role / Track',    icon: Briefcase },
  { id: 'mou',    label: 'By MoU',             icon: FileSignature },
]

// Static Tailwind class map — keeps the JIT compiler happy.
const ACCENT = {
  sky:     { eyebrow: 'text-sky-700',     btnOn: 'bg-sky-600 text-white border-sky-600',     tabOn: 'border-sky-600 text-sky-700 font-bold', iconColor: 'text-sky-700' },
  primary: { eyebrow: 'text-primary-dark',btnOn: 'bg-primary text-white border-primary',     tabOn: 'border-primary text-primary font-bold',  iconColor: 'text-primary-dark' },
  emerald: { eyebrow: 'text-emerald-700', btnOn: 'bg-emerald-600 text-white border-emerald-600', tabOn: 'border-emerald-600 text-emerald-700 font-bold', iconColor: 'text-emerald-700' },
  amber:   { eyebrow: 'text-amber-700',   btnOn: 'bg-amber-600 text-white border-amber-600', tabOn: 'border-amber-600 text-amber-700 font-bold', iconColor: 'text-amber-700' },
}

// Rename map: KPI id -> presentation
const VIEWS = {
  committed: { title: 'Total slots committed',     accent: 'sky',     hint: 'Sum of all active MoU slot counts. Lives at HQ level until allocated down to centres.' },
  allocated: { title: 'Slots allocated to centres', accent: 'primary', hint: 'Slots HQ has assigned from each MoU down to specific centres for hiring.' },
  confirmed: { title: 'Centre-confirmed slots',     accent: 'emerald', hint: 'Slots the receiving centre has validated by calling the local branch contact.' },
  gap:       { title: 'Confirmation gap',           accent: 'amber',   hint: 'Allocated − confirmed. Centres still need to phone the branch and confirm the slot count. Bigger gap = more delivery risk.' },
}

export default function TpDrilldownPage({ view: initialView, onBack }) {
  const [view, setView] = useState(initialView)
  const [pivot, setPivot] = useState('centre')

  const allMous = useMemo(() => getAllMous(), [])

  const v = VIEWS[view] || VIEWS.committed
  const vAccent = ACCENT[v.accent] || ACCENT.primary

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header — back, title, hint */}
      <div className="px-5 pt-4 pb-3 border-b border-bdr-light sticky top-0 bg-white z-10">
        <button onClick={onBack}
          className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Demand Master
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] uppercase tracking-[2px] font-bold ${vAccent.eyebrow}`}>Demand drilldown</div>
            <h2 className="text-[20px] font-bold text-txt-primary leading-tight mt-0.5">{v.title}</h2>
            <div className="text-[11px] text-txt-secondary mt-0.5 leading-snug max-w-2xl">{v.hint}</div>
          </div>
          {/* Metric switcher */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {Object.entries(VIEWS).map(([id, meta]) => {
              const a = ACCENT[meta.accent] || ACCENT.primary
              return (
                <button key={id} onClick={() => setView(id)}
                  className={`text-[10px] px-2 py-1 rounded-pill border ${view === id ? a.btnOn : 'bg-white border-bdr text-txt-secondary hover:border-primary'}`}>
                  {SHORT_METRIC[id]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Pivot tabs */}
        <div className="mt-3 flex items-center gap-1 border-b border-bdr-light -mb-3">
          {PIVOTS.map(p => {
            const I = p.icon
            return (
              <button key={p.id} onClick={() => setPivot(p.id)}
                className={`text-[11px] px-3 py-1.5 inline-flex items-center gap-1.5 border-b-2 ${pivot === p.id ? 'border-primary text-primary font-bold' : 'border-transparent text-txt-secondary hover:text-txt-primary'}`}>
                <I className="w-3 h-3" /> {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {pivot === 'centre' && <ByCentreTable allMous={allMous} metric={view} />}
        {pivot === 'role'   && <ByRoleTable   allMous={allMous} metric={view} />}
        {pivot === 'mou'    && <ByMouTable    allMous={allMous} metric={view} />}
      </div>
    </div>
  )
}

// Compact toggle labels for the metric switcher in the header
const SHORT_METRIC = {
  committed: 'Slots',
  allocated: 'Allocated',
  confirmed: 'Confirmed',
  gap:       'Conf. gap',
}

// Highlight class per metric so the numeric column stands out in tables
const METRIC_TONE = {
  committed: 'text-sky-700',
  allocated: 'text-primary-dark',
  confirmed: 'text-emerald-700',
  gap:       'text-amber-700',
}

// ── Pivot 1: By Training Centre ──────────────────────────────────────────
function ByCentreTable({ allMous, metric }) {
  const rows = useMemo(() => buildByCentre(allMous), [allMous])
  // Add a synthetic row for unallocated balance at HQ — only visible if any MoU has uncommitted-down-to-centre slots.
  const unallocated = useMemo(() => buildUnallocatedRow(allMous), [allMous])

  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
          <tr>
            <th className="text-left px-3 py-2 w-8"></th>
            <th className="text-left px-3 py-2">Training Centre</th>
            <th className="text-right px-3 py-2">MoUs</th>
            <th className="text-right px-3 py-2">Roles</th>
            <th className={`text-right px-3 py-2 ${metric === 'committed' ? 'bg-sky-50/60' : ''}`}>Slots</th>
            <th className={`text-right px-3 py-2 ${metric === 'allocated' ? 'bg-sky-50/60' : ''}`}>Allocated</th>
            <th className={`text-right px-3 py-2 ${metric === 'confirmed' ? 'bg-emerald-50/60' : ''}`}>Confirmed</th>
            <th className={`text-right px-3 py-2 ${metric === 'gap' ? 'bg-amber-50/60' : ''}`}>Conf. gap</th>
            <th className="text-right px-3 py-2">Demand ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => <ExpandableCentreRow key={r.centreId} row={r} metric={metric} />)}
          {unallocated.committed > 0 && (
            <tr className="border-t-2 border-amber-200 bg-amber-50/30 text-[12px]">
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 italic text-amber-800">HQ — slots committed but not yet allocated to a centre</td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-800">{unallocated.mous}</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right tabular-nums text-amber-800 font-bold">{unallocated.committed}</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2 text-right">—</td>
            </tr>
          )}
          <TotalsRow rows={rows} unallocated={unallocated} metric={metric} allMous={allMous} />
        </tbody>
      </table>
      <div className="text-[10px] text-txt-tertiary mt-2 italic px-1">
        Slots = parent MoU commitment from the employer. Same MoU touches multiple centres, so per-centre slot counts naturally overlap. The "TP-wide unique" row below is the deduped total.
      </div>
    </div>
  )
}

function ExpandableCentreRow({ row, metric }) {
  const [open, setOpen] = useState(false)
  const ratio = ratioBand(row.ratio)
  return (
    <>
      <tr className="border-t border-bdr-light/60 hover:bg-surface-page/40 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-3 py-2 text-txt-tertiary">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </td>
        <td className="px-3 py-2 font-medium text-txt-primary">{row.centreName}</td>
        <td className="px-3 py-2 text-right tabular-nums">{row.mous}</td>
        <td className="px-3 py-2 text-right tabular-nums">{row.roles.length}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'committed' ? 'font-bold ' + METRIC_TONE.committed : ''}`}>{row.slots}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{row.allocated}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{row.confirmed}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'gap'       ? 'font-bold ' + METRIC_TONE.gap       : ''} ${row.gap > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{row.gap}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          <span className={`px-1.5 py-0.5 rounded-pill text-[10px] ${PILL[ratio.tone]}`}>
            {row.plannedTotal ? `${row.ratio.toFixed(2)}×` : '—'}
          </span>
        </td>
      </tr>
      {open && (
        <tr className="bg-surface-page/30">
          <td colSpan={9} className="px-3 pb-3">
            <RoleBreakdownAtCentre roles={row.roles} metric={metric} />
          </td>
        </tr>
      )}
    </>
  )
}

function RoleBreakdownAtCentre({ roles, metric }) {
  return (
    <div className="ml-6 mt-1 rounded-lg border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-surface-page/50 text-[9px] uppercase tracking-wider text-txt-tertiary">
          <tr>
            <th className="text-left px-3 py-1.5">Role / Track</th>
            <th className="text-left px-3 py-1.5">Sector</th>
            <th className="text-left px-3 py-1.5">From employers</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'committed' ? 'bg-sky-50/60' : ''}`}>Slots</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'allocated' ? 'bg-sky-50/60' : ''}`}>Allocated</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'confirmed' ? 'bg-emerald-50/60' : ''}`}>Confirmed</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'gap'       ? 'bg-amber-50/60'   : ''}`}>Gap</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r, i) => (
            <tr key={i} className="border-t border-bdr-light/60">
              <td className="px-3 py-1.5 font-medium text-txt-primary">{r.role}</td>
              <td className="px-3 py-1.5 text-txt-secondary">{r.sector}</td>
              <td className="px-3 py-1.5 text-txt-secondary text-[10px]">{r.employers.map(e => `${e.name} (${e.slots})`).join(', ')}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'committed' ? 'font-bold ' + METRIC_TONE.committed : ''}`}>{r.slots}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{r.allocated}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{r.confirmed}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.allocated - r.confirmed > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{r.allocated - r.confirmed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Pivot 2: By Role / Track ─────────────────────────────────────────────
function ByRoleTable({ allMous, metric }) {
  const rows = useMemo(() => buildByRole(allMous), [allMous])
  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
          <tr>
            <th className="text-left px-3 py-2 w-8"></th>
            <th className="text-left px-3 py-2">Role / Track</th>
            <th className="text-left px-3 py-2">Sector</th>
            <th className="text-right px-3 py-2">MoUs</th>
            <th className="text-right px-3 py-2">Centres</th>
            <th className={`text-right px-3 py-2 ${metric === 'committed' ? 'bg-sky-50/60' : ''}`}>Slots</th>
            <th className={`text-right px-3 py-2 ${metric === 'allocated' ? 'bg-sky-50/60' : ''}`}>Allocated</th>
            <th className={`text-right px-3 py-2 ${metric === 'confirmed' ? 'bg-emerald-50/60' : ''}`}>Confirmed</th>
            <th className={`text-right px-3 py-2 ${metric === 'gap'       ? 'bg-amber-50/60'   : ''}`}>Conf. gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => <ExpandableRoleRow key={r.role} row={r} metric={metric} />)}
          <RoleTotalsRow rows={rows} metric={metric} />
        </tbody>
      </table>
    </div>
  )
}

function ExpandableRoleRow({ row, metric }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="border-t border-bdr-light/60 hover:bg-surface-page/40 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-3 py-2 text-txt-tertiary">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </td>
        <td className="px-3 py-2 font-medium text-txt-primary">{row.role}</td>
        <td className="px-3 py-2 text-txt-secondary">{row.sector}</td>
        <td className="px-3 py-2 text-right tabular-nums">{row.mous}</td>
        <td className="px-3 py-2 text-right tabular-nums">{row.centres.length}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'committed' ? 'font-bold ' + METRIC_TONE.committed : ''}`}>{row.committed}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{row.allocated}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{row.confirmed}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'gap'       ? 'font-bold ' + METRIC_TONE.gap       : ''} ${row.gap > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{row.gap}</td>
      </tr>
      {open && (
        <tr className="bg-surface-page/30">
          <td colSpan={9} className="px-3 pb-3">
            <CentreBreakdownForRole centres={row.centres} metric={metric} />
          </td>
        </tr>
      )}
    </>
  )
}

function CentreBreakdownForRole({ centres, metric }) {
  return (
    <div className="ml-6 mt-1 rounded-lg border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-surface-page/50 text-[9px] uppercase tracking-wider text-txt-tertiary">
          <tr>
            <th className="text-left px-3 py-1.5">Centre</th>
            <th className="text-left px-3 py-1.5">Employer · Branch</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'committed' ? 'bg-sky-50/60' : ''}`}>MoU slots</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'allocated' ? 'bg-sky-50/60' : ''}`}>Allocated</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'confirmed' ? 'bg-emerald-50/60' : ''}`}>Confirmed</th>
            <th className={`text-right px-3 py-1.5 ${metric === 'gap'       ? 'bg-amber-50/60'   : ''}`}>Gap</th>
            <th className="text-left px-3 py-1.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {centres.map((c, i) => (
            <tr key={i} className="border-t border-bdr-light/60">
              <td className="px-3 py-1.5 font-medium text-txt-primary">{c.centreName}</td>
              <td className="px-3 py-1.5 text-txt-secondary text-[10px]">{c.employerName} · {c.branchName || '—'}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'committed' ? 'font-bold ' + METRIC_TONE.committed : ''}`}>{c.mouSlots}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{c.allocated}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{c.confirmed}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${c.allocated - c.confirmed > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{c.allocated - c.confirmed}</td>
              <td className="px-3 py-1.5 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded-pill ${c.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : c.status === 'declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Pivot 3: By MoU ──────────────────────────────────────────────────────
function ByMouTable({ allMous, metric }) {
  const active = allMous.filter(m => m.status !== 'expired')
  return (
    <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
          <tr>
            <th className="text-left px-3 py-2 w-8"></th>
            <th className="text-left px-3 py-2">Employer · Role</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Centres</th>
            <th className={`text-right px-3 py-2 ${metric === 'committed' ? 'bg-sky-50/60' : ''}`}>Slots</th>
            <th className={`text-right px-3 py-2 ${metric === 'allocated' ? 'bg-sky-50/60' : ''}`}>Allocated</th>
            <th className={`text-right px-3 py-2 ${metric === 'confirmed' ? 'bg-emerald-50/60' : ''}`}>Confirmed</th>
            <th className={`text-right px-3 py-2 ${metric === 'gap'       ? 'bg-amber-50/60'   : ''}`}>Conf. gap</th>
            <th className="text-right px-3 py-2">Unalloc.</th>
          </tr>
        </thead>
        <tbody>
          {active.map(m => <ExpandableMouRow key={m.id} mou={m} metric={metric} />)}
        </tbody>
      </table>
    </div>
  )
}

function ExpandableMouRow({ mou, metric }) {
  const [open, setOpen] = useState(false)
  const allocated = mou.allocations.reduce((s, a) => s + a.allocated, 0)
  const confirmed = mou.allocations.reduce((s, a) => s + a.confirmed, 0)
  const gap = allocated - confirmed
  const unalloc = mou.totalSlots - allocated
  return (
    <>
      <tr className="border-t border-bdr-light/60 hover:bg-surface-page/40 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-3 py-2 text-txt-tertiary">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </td>
        <td className="px-3 py-2">
          <div className="font-medium text-txt-primary">{mou.employer.name}</div>
          <div className="text-[10px] text-txt-tertiary">{mou.role} · {mou.employer.sector}</div>
        </td>
        <td className="px-3 py-2 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded-pill ${mou.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {mou.status}
          </span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{mou.allocations.length}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'committed' ? 'font-bold ' + METRIC_TONE.committed : ''}`}>{mou.totalSlots}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{allocated}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{confirmed}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${metric === 'gap'       ? 'font-bold ' + METRIC_TONE.gap       : ''} ${gap > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{gap}</td>
        <td className={`px-3 py-2 text-right tabular-nums ${unalloc > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{unalloc}</td>
      </tr>
      {open && (
        <tr className="bg-surface-page/30">
          <td colSpan={9} className="px-3 pb-3">
            <MouAllocationBreakdown mou={mou} metric={metric} />
          </td>
        </tr>
      )}
    </>
  )
}

function MouAllocationBreakdown({ mou, metric }) {
  return (
    <div className="ml-6 mt-1 rounded-lg border border-bdr-light bg-white overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-surface-page/50 text-[9px] uppercase tracking-wider text-txt-tertiary">
          <tr>
            <th className="text-left px-3 py-1.5">Centre</th>
            <th className="text-left px-3 py-1.5">Branch</th>
            <th className="text-left px-3 py-1.5">Branch contact</th>
            <th className="text-right px-3 py-1.5">Allocated</th>
            <th className="text-right px-3 py-1.5">Confirmed</th>
            <th className="text-right px-3 py-1.5">Gap</th>
            <th className="text-left px-3 py-1.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {mou.allocations.map((a, i) => {
            const centre = CENTRES.find(c => c.id === a.centreId)
            return (
              <tr key={i} className="border-t border-bdr-light/60">
                <td className="px-3 py-1.5 font-medium text-txt-primary">{centre?.name || a.centreId}</td>
                <td className="px-3 py-1.5 text-txt-secondary">{a.branchName || '—'}</td>
                <td className="px-3 py-1.5 text-txt-secondary text-[10px]">
                  {a.branchContactName ? <>{a.branchContactName} · {a.branchContactPhone}</> : <span className="italic text-amber-700">awaiting centre</span>}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'allocated' ? 'font-bold ' + METRIC_TONE.allocated : ''}`}>{a.allocated}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${metric === 'confirmed' ? 'font-bold ' + METRIC_TONE.confirmed : ''}`}>{a.confirmed}</td>
                <td className={`px-3 py-1.5 text-right tabular-nums ${a.allocated - a.confirmed > 0 ? 'text-amber-700' : 'text-txt-tertiary'}`}>{a.allocated - a.confirmed}</td>
                <td className="px-3 py-1.5 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded-pill ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : a.status === 'declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Totals row for "By Centre" pivot ─────────────────────────────────────
// Slots cell shows the TP-wide UNIQUE total (each MoU counted once) rather
// than the column sum, which would double-count any MoU shared by multiple
// centres. The row label calls that out so it's not surprising.
function TotalsRow({ rows, unallocated, metric, allMous }) {
  const t = rows.reduce((acc, r) => ({
    mous: acc.mous + r.mous,
    allocated: acc.allocated + r.allocated,
    confirmed: acc.confirmed + r.confirmed,
    gap: acc.gap + r.gap,
  }), { mous: 0, allocated: 0, confirmed: 0, gap: 0 })
  const uniqueMous = (allMous || []).filter(m => m.status !== 'expired')
  const uniqueSlots = uniqueMous.reduce((s, m) => s + m.totalSlots, 0)
  return (
    <tr className="border-t-2 border-bdr-light bg-surface-page/30 text-[12px]">
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 font-bold text-txt-primary">TP-wide unique total <span className="text-[9px] font-normal text-txt-tertiary">(each MoU counted once)</span></td>
      <td className="px-3 py-2 text-right tabular-nums font-bold">{uniqueMous.length}</td>
      <td className="px-3 py-2 text-right tabular-nums font-bold">—</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'committed' ? METRIC_TONE.committed : ''}`}>{uniqueSlots}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'allocated' ? METRIC_TONE.allocated : ''}`}>{t.allocated}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'confirmed' ? METRIC_TONE.confirmed : ''}`}>{t.confirmed}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'gap' ? METRIC_TONE.gap : ''}`}>{t.gap}</td>
      <td className="px-3 py-2"></td>
    </tr>
  )
}

function RoleTotalsRow({ rows, metric }) {
  const t = rows.reduce((acc, r) => ({
    committed: acc.committed + r.committed,
    allocated: acc.allocated + r.allocated,
    confirmed: acc.confirmed + r.confirmed,
    gap: acc.gap + r.gap,
  }), { committed: 0, allocated: 0, confirmed: 0, gap: 0 })
  return (
    <tr className="border-t-2 border-bdr-light bg-surface-page/30 text-[12px]">
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 font-bold text-txt-primary" colSpan={4}>Total across roles</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'committed' ? METRIC_TONE.committed : ''}`}>{t.committed}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'allocated' ? METRIC_TONE.allocated : ''}`}>{t.allocated}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'confirmed' ? METRIC_TONE.confirmed : ''}`}>{t.confirmed}</td>
      <td className={`px-3 py-2 text-right tabular-nums font-bold ${metric === 'gap' ? METRIC_TONE.gap : ''}`}>{t.gap}</td>
    </tr>
  )
}

const PILL = {
  emerald: 'bg-emerald-100 text-emerald-800',
  sky:     'bg-sky-100     text-sky-800',
  amber:   'bg-amber-100   text-amber-800',
  rose:    'bg-rose-100    text-rose-800',
}

// ── Aggregators ───────────────────────────────────────────────────────────

// Per-centre rollup with role breakdown and ratio against planned enrol.
// Slot counts shown at the centre level represent the parent MoU pool — i.e.
// "of the 4 MoUs touching this centre, how many slots do they hold in total".
// These naturally double-count when an MoU is shared by multiple centres, so
// the totals row uses the TP-wide unique slot count instead of the column sum.
function buildByCentre(allMous) {
  const byCentre = new Map()
  for (const m of allMous) {
    if (m.status === 'expired') continue
    for (const a of m.allocations) {
      const id = a.centreId
      if (!byCentre.has(id)) {
        const centre = CENTRES.find(c => c.id === id)
        byCentre.set(id, {
          centreId: id,
          centreName: centre?.name || id,
          mouSet: new Set(),
          mouSlots: new Map(), // mouId -> mou.totalSlots (deduped per MoU)
          roles: new Map(),
          allocated: 0,
          confirmed: 0,
        })
      }
      const row = byCentre.get(id)
      row.mouSet.add(m.id)
      row.mouSlots.set(m.id, m.totalSlots)
      row.allocated += a.allocated
      row.confirmed += a.confirmed
      const rk = m.role
      if (!row.roles.has(rk)) {
        row.roles.set(rk, { role: rk, sector: m.employer.sector, slotsByMou: new Map(), allocated: 0, confirmed: 0, employers: [] })
      }
      const r = row.roles.get(rk)
      r.slotsByMou.set(m.id, m.totalSlots)
      r.allocated += a.allocated
      r.confirmed += a.confirmed
      r.employers.push({ name: m.employer.name, slots: m.totalSlots })
    }
  }
  return Array.from(byCentre.values()).map(r => {
    const plannedTotal = getPlannedTotal(r.centreId)
    return {
      ...r,
      mous: r.mouSet.size,
      slots: Array.from(r.mouSlots.values()).reduce((s, x) => s + x, 0),
      roles: Array.from(r.roles.values()).map(role => ({
        ...role,
        slots: Array.from(role.slotsByMou.values()).reduce((s, x) => s + x, 0),
      })).sort((a, b) => b.allocated - a.allocated),
      gap: r.allocated - r.confirmed,
      plannedTotal,
      ratio: plannedTotal ? r.confirmed / plannedTotal : 0,
    }
  }).sort((a, b) => b.allocated - a.allocated)
}

// Total committed at HQ that hasn't been allocated to any centre yet.
function buildUnallocatedRow(allMous) {
  let committed = 0
  let mouCount = 0
  for (const m of allMous) {
    if (m.status === 'expired') continue
    const alloc = m.allocations.reduce((s, a) => s + a.allocated, 0)
    const unalloc = m.totalSlots - alloc
    if (unalloc > 0) {
      committed += unalloc
      mouCount++
    }
  }
  return { committed, mous: mouCount }
}

// Per-role rollup with centre breakdown.
function buildByRole(allMous) {
  const byRole = new Map() // role -> {role, sector, mouSet, centres: [{centreName, employerName, branchName, allocated, confirmed, status}], committed, allocated, confirmed}
  for (const m of allMous) {
    if (m.status === 'expired') continue
    const rk = m.role
    if (!byRole.has(rk)) {
      byRole.set(rk, {
        role: rk,
        sector: m.employer.sector,
        mouSet: new Set(),
        centres: [],
        committed: 0,
        allocated: 0,
        confirmed: 0,
      })
    }
    const row = byRole.get(rk)
    row.mouSet.add(m.id)
    row.committed += m.totalSlots
    for (const a of m.allocations) {
      const centre = CENTRES.find(c => c.id === a.centreId)
      row.allocated += a.allocated
      row.confirmed += a.confirmed
      row.centres.push({
        centreName: centre?.name || a.centreId,
        employerName: m.employer.name,
        mouSlots: m.totalSlots,
        branchName: a.branchName,
        allocated: a.allocated,
        confirmed: a.confirmed,
        status: a.status,
      })
    }
  }
  return Array.from(byRole.values()).map(r => ({
    ...r,
    mous: r.mouSet.size,
    gap: r.allocated - r.confirmed,
  })).sort((a, b) => b.committed - a.committed)
}
