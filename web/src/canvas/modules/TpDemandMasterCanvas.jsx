// Demand Master · TP HQ surface
//
// What this is: the national MoU register for Magic Bus HQ. Each MoU is an
// employer commitment for a specific role, with slots allocated down to
// specific centres. The TP's job is to:
//   • Sign and maintain national MoUs (national hiring drives)
//   • Allocate slots from each MoU to specific centres
//   • Audit the gap between allocated slots and centre-confirmed slots
//   • Capture the employer skill demand sheet (seeds curriculum alignment)
//
// The TC side (TcDemandBoardCanvas) is where each centre confirms the slots
// allocated to it, names the local branch contact, and runs against its
// planned-enrolment ratio.
//
// Key M&E signal surfaced: handoff gap = allocated − confirmed. Funder
// dashboard will eventually consume this directly.

import { useEffect, useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { TP_PROFILE, TP_ROLLUP } from './_tp/data.js'
import {
  getAllMous, computeTpRollup, allCentreSummaries, ratioBand,
  readCentreSecured, updateCentreSecuredStatus,
  addTpMou, updateMouSkillSheet, CENTRES,
  centresWithOverrides, hasPlanOverride,
} from './_demand/data.js'
import TpDrilldownPage from './_demand/TpDrilldownPage.jsx'
import {
  Handshake, MapPin, Building2, FileSignature, Sparkles, AlertTriangle,
  CheckCircle2, Clock, X, FileText, ListOrdered, Phone, Mail, Hash, Search,
  Inbox, ArrowUpRight, Plus, Edit3, GripVertical, Trash2, History, PencilLine,
} from 'lucide-react'

const QUICK_ASKS = [
  'Which centres are below the 1.0× demand ratio for Q3?',
  'Where am I leaking allocated slots — show the handoff gap',
  'Which sectors do I have the strongest commitments in?',
  'Has Khadi & VIC sent back their signed demand letter yet?',
  'Recommend which centres to allocate the next 50 HDFC slots to',
  'Audit: any expired MoUs that should be renewed?',
  'Build a demand-coverage plan for tc-bhopal — they are short',
  'Compare this quarter\'s commitment ratio vs Q2',
]

export default function TpDemandMasterCanvas({ context }) {
  const { showToast } = useApp() || {}
  const [pending, setPending] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showAddMou, setShowAddMou] = useState(false)
  const [showEditSkills, setShowEditSkills] = useState(false)
  const [drillView, setDrillView] = useState(null) // null | 'committed' | 'allocated' | 'confirmed' | 'gap'
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  // Centre-originated commitments waiting for HQ review.
  const [centreSecured, setCentreSecured] = useState(() => readCentreSecured())
  // Live combined MoU list (fixture + TP-added + skill overrides applied).
  const [allMous, setAllMous] = useState(() => getAllMous())
  // Centres that have overridden their planned-enrolment plan locally.
  const [overrides, setOverrides] = useState(() => centresWithOverrides())
  useEffect(() => {
    const refresh = () => {
      setCentreSecured(readCentreSecured())
      setAllMous(getAllMous())
      setOverrides(centresWithOverrides())
    }
    window.addEventListener('ksk:demand-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('ksk:demand-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const pendingReview = centreSecured.filter(r => r.status === 'pending_hq_review')

  // First MoU selected by default; falls back gracefully when list changes.
  const [selectedMouId, setSelectedMouId] = useState(allMous[0]?.id)
  useEffect(() => {
    if (!allMous.find(m => m.id === selectedMouId) && allMous[0]) setSelectedMouId(allMous[0].id)
  }, [allMous, selectedMouId])

  function decideOnSecured(id, accept) {
    updateCentreSecuredStatus(id, accept ? 'hq_accepted' : 'hq_declined', accept ? 'Incorporated into national register' : 'Did not meet HQ criteria')
    setCentreSecured(readCentreSecured())
    showToast?.({ kind: accept ? 'success' : 'info', text: accept ? 'Accepted — added to TP register' : 'Declined — flagged back to centre' })
  }

  const rollup = useMemo(() => computeTpRollup(), [allMous])
  const centreRows = useMemo(() => allCentreSummaries(), [allMous])

  const filteredMoUs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allMous.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (!q) return true
      return m.employer.name.toLowerCase().includes(q) ||
             m.role.toLowerCase().includes(q) ||
             m.employer.sector.toLowerCase().includes(q)
    })
  }, [query, statusFilter, allMous])

  const selected = allMous.find(m => m.id === selectedMouId)

  const kpiCard = {
    title: 'Q3 demand portfolio · pre-batch commitment',
    items: [
      { label: 'Total slots committed', value: rollup.totalSlots.toLocaleString('en-IN'), tone: 'primary',
        hint: 'Click to see distribution by centre, role and MoU',
        onClick: () => setDrillView('committed') },
      { label: 'Allocated to centres',  value: rollup.totalAllocated.toLocaleString('en-IN'), tone: 'sky',
        hint: 'Click to see how slots are split across centres',
        onClick: () => setDrillView('allocated') },
      { label: 'Centre-confirmed',      value: rollup.totalConfirmed.toLocaleString('en-IN'), delta: `${Math.round(rollup.totalConfirmed / Math.max(rollup.totalAllocated, 1) * 100)}% of allocated`, tone: 'emerald',
        hint: 'Click to see which centres still need to back-confirm',
        onClick: () => setDrillView('confirmed') },
      { label: 'Confirmation gap',      value: rollup.handoffGap.toLocaleString('en-IN'), delta: rollup.handoffGap > 0 ? 'centres still to confirm with branch' : 'all back-confirmed', tone: rollup.handoffGap > 0 ? 'amber' : 'emerald',
        hint: 'Allocated minus confirmed. Click to see where the gap is.',
        onClick: () => setDrillView('gap') },
      { label: 'Active MoUs',           value: rollup.activeMoUs.toString(), tone: 'violet',
        hint: 'National employer agreements currently in force' },
      { label: 'Awaiting centre confirm',value: rollup.pendingAllocations.toString(), tone: 'amber',
        hint: 'Allocations waiting for the receiving centre to act' },
      { label: 'Centre-originated · pending', value: pendingReview.length.toString(), tone: 'fuchsia',
        hint: 'Local employers logged by centres, awaiting your review' },
      { label: 'Centres with plan edits', value: overrides.length.toString(), tone: 'amber',
        hint: 'Centres that have overridden their planned-enrolment plan locally' },
    ],
  }

  const centreCoverageBar = {
    title: 'Demand ratio by centre · confirmed slots ÷ planned enrolment',
    annotation: 'Target ≥ 1.5×. Below 1.0× will block batch creation at the centre. Yellow bars = below target, red = batch-blocking.',
    unit: '× ratio (100 = 1.0×)',
    color: 'primary',
    data: centreRows
      .slice()
      .sort((a, b) => b.ratio - a.ratio)
      .map(r => {
        const band = ratioBand(r.ratio)
        return { label: r.centre.city, value: Math.round(r.ratio * 100), color: band.tone }
      }),
  }

  const centreTable = {
    title: 'Centre allocation status',
    columns: [
      { key: 'centre',     label: 'Centre' },
      { key: 'planned',    label: 'Planned enrol', type: 'number' },
      { key: 'allocated',  label: 'Slots allocated', type: 'number' },
      { key: 'confirmed',  label: 'Confirmed',     type: 'number' },
      { key: 'gap',        label: 'Gap',           type: 'number' },
      { key: 'ratio',      label: 'Demand ratio' },
      { key: 'band',       label: 'Status' },
    ],
    rows: centreRows.map(r => {
      const b = ratioBand(r.ratio)
      return {
        centre: r.centre.name,
        planned: r.plannedEnrol,
        allocated: r.allocated,
        confirmed: r.confirmed,
        gap: r.allocated - r.confirmed,
        ratio: r.ratio ? `${r.ratio.toFixed(2)}×` : '—',
        band: b.label,
      }
    }),
    highlight: centreRows.some(r => r.ratio < 1) ? 'Centres below 1.0× cannot start a new Q3 batch until demand catches up.' : null,
  }

  const dashboard = (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-sky-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-sky-700 inline-flex items-center gap-1">
          <Handshake className="w-3 h-3" /> Training Partner · Demand
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">Demand Master — {TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres</span>
          <span className="font-bold text-sky-700">{rollup.totalSlots.toLocaleString('en-IN')} slots committed across {rollup.activeMoUs} active MoUs</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <KpiGridCard card={kpiCard} />

        {/* Action bar: where demand is created */}
        <div className="rounded-2xl border-2 border-dashed border-sky-300 bg-white p-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-txt-primary inline-flex items-center gap-1.5">
              <FileSignature className="w-4 h-4 text-sky-700" /> Signed a new national MoU?
            </div>
            <div className="text-[11px] text-txt-secondary mt-0.5">
              Add the employer, the role, the slot count, the skill demand sheet, and allocate slots down to specific centres.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => askSaathi('I want to add a new national MoU. Suggest what employer, role and slot count makes sense given our current portfolio and centre coverage gaps.')}
              className="px-3 py-2 rounded-pill bg-white border border-bdr text-txt-primary text-[12px] font-bold inline-flex items-center gap-1.5 hover:border-sky-400">
              <Sparkles className="w-4 h-4" /> Ask Saathi
            </button>
            <button onClick={() => setShowAddMou(true)}
              className="px-3 py-2 rounded-pill bg-sky-600 text-white text-[12px] font-bold inline-flex items-center gap-1.5 hover:opacity-90">
              <Plus className="w-4 h-4" /> Add MoU
            </button>
          </div>
        </div>

        {/* Centre-originated review queue */}
        {centreSecured.length > 0 && (
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-4 h-4 text-fuchsia-700" />
              <div className="text-[12px] font-bold text-fuchsia-800 uppercase tracking-wider">
                Centre-originated commitments ({centreSecured.length})
              </div>
              {pendingReview.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-pill bg-fuchsia-600 text-white font-bold">
                  {pendingReview.length} awaiting your review
                </span>
              )}
            </div>
            <div className="space-y-2">
              {centreSecured.map(r => (
                <CentreOriginatedRow key={r.id} row={r}
                  onAccept={() => decideOnSecured(r.id, true)}
                  onDecline={() => decideOnSecured(r.id, false)} />
              ))}
            </div>
            <div className="text-[10px] text-fuchsia-700 mt-3 italic">
              These were logged by centre heads who secured employer commitments locally. Accepting promotes them to the national register.
            </div>
          </div>
        )}

        {/* Centre plan-override visibility */}
        {overrides.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <PencilLine className="w-4 h-4 text-amber-700" />
              <div className="text-[12px] font-bold text-amber-900 uppercase tracking-wider">
                Centres with edited plans ({overrides.length})
              </div>
            </div>
            <div className="space-y-2">
              {overrides.map(o => (
                <PlanOverrideRow key={o.centreId} row={o} onAsk={askSaathi} />
              ))}
            </div>
            <div className="text-[10px] text-amber-800 mt-3 italic">
              Centres have edited their planned-enrolment locally. Each edit is logged with timestamp and actor. Review whether the new plan is realistic given current allocations.
            </div>
          </div>
        )}

        {/* Filter strip */}
        <div className="rounded-2xl border border-bdr-light bg-white p-3 flex items-center gap-3 flex-wrap">
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1">
            <ListOrdered className="w-3 h-3" /> National MoUs
          </div>
          <div className="flex items-center gap-1">
            {['all', 'active', 'draft', 'expired'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-[11px] px-2.5 py-1 rounded-pill border ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white border-bdr text-txt-secondary hover:border-primary'}`}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto rounded-pill border border-bdr bg-white px-2 py-1">
            <Search className="w-3 h-3 text-txt-tertiary" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Employer, role, sector…"
              className="bg-transparent outline-none text-[12px] w-48 placeholder:text-txt-tertiary" />
          </div>
        </div>

        {/* MoU list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: list */}
          <div className="lg:col-span-2 space-y-2">
            {filteredMoUs.map(m => (
              <MouRow key={m.id} mou={m} active={m.id === selectedMouId} onClick={() => setSelectedMouId(m.id)} />
            ))}
            {filteredMoUs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-bdr-light p-6 text-center text-[12px] text-txt-secondary">
                No MoUs match. Clear filters.
              </div>
            )}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-3">
            {selected && <MouDetail mou={selected} onAsk={askSaathi} onEditSkills={() => setShowEditSkills(true)} />}
          </div>
        </div>

        {/* Centre coverage */}
        <BarChartCard card={centreCoverageBar} />
        <DataTableCard card={centreTable} />

        {/* Recommend CTA */}
        <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-sky-50/40 to-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-txt-primary">Allocation gaps to close</div>
            <div className="text-[11px] text-txt-secondary">Saathi can recommend which centres to allocate fresh MoU slots to, based on current ratios and skill-match.</div>
          </div>
          <button onClick={() => askSaathi('Audit Q3 demand coverage across all 10 centres. Rank centres by ratio shortfall, recommend which to allocate the next 100 slots to, and emit an action_panel I can dispatch as a broadcast to the named employers.')}
            className="px-3 py-1.5 rounded-pill bg-sky-600 text-white text-[12px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
            <Sparkles className="w-3 h-3" /> Build allocation plan
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddMou && (
        <AddMouModal
          onClose={() => setShowAddMou(false)}
          onSubmit={(payload) => {
            const row = addTpMou(payload)
            setAllMous(getAllMous())
            setSelectedMouId(row.id)
            setShowAddMou(false)
            showToast?.({ kind: 'success', text: `New MoU added: ${row.employer.name} · ${row.totalSlots} slots` })
          }}
        />
      )}
      {showEditSkills && selected && (
        <EditSkillsModal
          mou={selected}
          onClose={() => setShowEditSkills(false)}
          onSave={(skills) => {
            updateMouSkillSheet(selected.id, skills)
            setAllMous(getAllMous())
            setShowEditSkills(false)
            showToast?.({ kind: 'success', text: `Updated skill demand sheet for ${selected.employer.name}` })
          }}
        />
      )}
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · Demand Master"
      useWebSearch={false}
      extraSystem={
        `You are inside the DEMAND MASTER for ${TP_PROFILE.name}. ` +
        `Active MoUs: ${rollup.activeMoUs}, total slots ${rollup.totalSlots}, allocated ${rollup.totalAllocated}, centre-confirmed ${rollup.totalConfirmed}, handoff gap ${rollup.handoffGap}. ` +
        "The leading signal we capture is the pre-batch employer commitment ratio (confirmed slots ÷ planned enrolment per centre, target ≥ 1.5×, below 1.0× blocks batch creation). " +
        "Emit ONE chart card per analytic answer (kpi_grid / bar_chart / data_table) and an action_panel when an intervention is needed. " +
        "If the user asks about a different step (Selection, Training, Mentorship, Placement, Retention), suggest opening that module."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={QUICK_ASKS}
    />
  )

  // The drilldown page takes over the dashboard half of the screen when a
  // KPI is clicked. The Saathi chat below stays where it is.
  const top = drillView
    ? <TpDrilldownPage view={drillView} onBack={() => setDrillView(null)} />
    : dashboard

  return <ResizableSaathiSplit top={top} bottom={chat} />
}

// ── MoU row in the left list ─────────────────────────────────────────────
function MouRow({ mou, active, onClick }) {
  const totalAlloc = mou.allocations.reduce((s, a) => s + a.allocated, 0)
  const totalConf  = mou.allocations.reduce((s, a) => s + a.confirmed, 0)
  const sBadge = STATUS_BADGE[mou.status]
  const SIcon = sBadge.icon
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-2xl border ${active ? 'border-primary bg-primary-light/20' : 'border-bdr-light bg-white hover:border-primary/40'} p-3 shadow-card transition`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-txt-primary truncate">{mou.employer.name}</div>
          <div className="text-[11px] text-txt-secondary truncate">{mou.role} · NSQF L{mou.nsqfLevel} · {mou.employer.sector}</div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold flex-shrink-0 ${sBadge.pill}`}>
          <SIcon className="w-3 h-3" /> {sBadge.label}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <KpiTiny label="Slots"      value={mou.totalSlots} />
        <KpiTiny label="Allocated"  value={totalAlloc} />
        <KpiTiny label="Unallocated"value={mou.totalSlots - totalAlloc} tone={(mou.totalSlots - totalAlloc) > 0 ? 'amber' : 'emerald'} />
        <KpiTiny label="Confirmed"  value={totalConf} tone={totalConf === totalAlloc ? 'emerald' : 'amber'} />
      </div>
      <div className="text-[10px] text-txt-tertiary mt-2">
        ₹{mou.ctcMonthly.min.toLocaleString('en-IN')}–{mou.ctcMonthly.max.toLocaleString('en-IN')} / mo · Valid till {mou.validityUntil}
      </div>
    </button>
  )
}

// ── MoU detail panel ─────────────────────────────────────────────────────
function MouDetail({ mou, onAsk, onEditSkills }) {
  const totalAlloc = mou.allocations.reduce((s, a) => s + a.allocated, 0)
  const totalConf  = mou.allocations.reduce((s, a) => s + a.confirmed, 0)
  const fill = Math.round(totalConf / Math.max(mou.totalSlots, 1) * 100)
  const sBadge = STATUS_BADGE[mou.status]
  const SIcon = sBadge.icon

  return (
    <div className="rounded-2xl border border-bdr-light bg-white shadow-card p-4 space-y-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary">{mou.employer.sector}</div>
          <div className="text-[18px] font-bold text-txt-primary leading-tight">{mou.employer.name}</div>
          <div className="text-[12px] text-txt-secondary">{mou.role} · NSQF Level {mou.nsqfLevel}</div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-pill border text-[11px] font-bold flex-shrink-0 ${sBadge.pill}`}>
          <SIcon className="w-3 h-3" /> {sBadge.label}
        </span>
      </div>

      {/* Reason banner for non-active MoUs */}
      {mou.expiredReason && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] px-3 py-2 inline-flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{mou.expiredReason}</span>
        </div>
      )}
      {mou.draftReason && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] px-3 py-2 inline-flex items-start gap-2">
          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{mou.draftReason}</span>
        </div>
      )}

      {/* Slot lifecycle — committed → allocated → confirmed, with unallocated split out */}
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5">Slot lifecycle</div>
        <div className="grid grid-cols-5 gap-2">
          <SlotPill label="Slots committed" sub="from this MoU" value={mou.totalSlots} tone="sky" />
          <SlotPill label="Allocated to centres" sub="HQ assigned to TCs" value={totalAlloc} tone="primary" />
          <SlotPill label="Unallocated" sub="still with HQ" value={mou.totalSlots - totalAlloc}
            tone={(mou.totalSlots - totalAlloc) > 0 ? 'amber' : 'emerald'} />
          <SlotPill label="Confirmed" sub="branch back-confirmed" value={totalConf} tone="emerald" />
          <SlotPill label="Confirmation gap" sub="allocated − confirmed" value={totalAlloc - totalConf}
            tone={(totalAlloc - totalConf) > 0 ? 'amber' : 'emerald'} />
        </div>
        {/* Three-tone progress bar so the flow is glance-able */}
        <div className="mt-2 h-2 rounded-pill bg-slate-100 overflow-hidden flex">
          {totalConf > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(totalConf / mou.totalSlots) * 100}%` }} title={`${totalConf} confirmed`} />}
          {(totalAlloc - totalConf) > 0 && <div className="h-full bg-sky-300" style={{ width: `${((totalAlloc - totalConf) / mou.totalSlots) * 100}%` }} title={`${totalAlloc - totalConf} allocated, awaiting confirm`} />}
          {(mou.totalSlots - totalAlloc) > 0 && <div className="h-full bg-amber-300" style={{ width: `${((mou.totalSlots - totalAlloc) / mou.totalSlots) * 100}%` }} title={`${mou.totalSlots - totalAlloc} unallocated`} />}
        </div>
        <div className="text-[10px] text-txt-tertiary mt-1 flex items-center gap-3">
          <span><span className="inline-block w-2 h-2 rounded bg-emerald-500 align-middle mr-1" />Confirmed</span>
          <span><span className="inline-block w-2 h-2 rounded bg-sky-300 align-middle mr-1" />Allocated, awaiting confirm</span>
          <span><span className="inline-block w-2 h-2 rounded bg-amber-300 align-middle mr-1" />Still with HQ</span>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Meta label="GSTIN"      value={mou.employer.gstin} icon={Hash} />
        <Meta label="CTC band"   value={`₹${mou.ctcMonthly.min.toLocaleString('en-IN')}–${mou.ctcMonthly.max.toLocaleString('en-IN')}`} />
        <Meta label="Validity"   value={`${mou.validityFrom} → ${mou.validityUntil}`} />
        <Meta label="Created"    value={mou.createdAt} />
        <Meta label="Contact"    value={mou.contactPerson.name + ' · ' + mou.contactPerson.role} icon={Phone} />
        <Meta label="Email"      value={mou.contactPerson.email} icon={Mail} />
      </div>

      {/* Signed letter */}
      <div className="rounded-lg border border-bdr-light bg-surface-page/50 p-2.5 flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-txt-tertiary flex-shrink-0" />
        <div className="text-[11px] text-txt-secondary flex-1 min-w-0 truncate">
          Signed letter: <span className="font-bold text-txt-primary">{mou.signedLetterStub}</span>
          {mou.signedLetterParsedSlots != null && (
            <span className="ml-2 text-[10px] text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> AI parsed: {mou.signedLetterParsedSlots} slots match
            </span>
          )}
        </div>
      </div>

      {/* Skill demand sheet */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1">
            <FileText className="w-3 h-3" /> Employer-ranked skills ({mou.skillDemandSheet.length})
          </div>
          {onEditSkills && (
            <button onClick={onEditSkills}
              className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary">
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
        <div className="rounded-lg border border-bdr-light bg-white">
          {mou.skillDemandSheet.map(s => (
            <div key={s.rank} className="flex items-center gap-3 px-3 py-1.5 border-b border-bdr-light/60 last:border-b-0 text-[12px]">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold inline-flex items-center justify-center text-[10px]">{s.rank}</span>
              <span className="text-txt-primary">{s.skill}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-txt-tertiary mt-1.5">
          This sheet seeds the curriculum-employer alignment score (used downstream in training-curriculum alignment).
        </div>
      </div>

      {/* Allocations */}
      <div>
        <div className="text-[11px] uppercase tracking-wider font-bold text-txt-tertiary mb-1.5 inline-flex items-center gap-1">
          <Building2 className="w-3 h-3" /> Centre allocations
        </div>
        <div className="rounded-lg border border-bdr-light bg-white overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
              <tr>
                <th className="text-left px-3 py-2">Centre · Branch</th>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-right px-3 py-2">Alloc</th>
                <th className="text-right px-3 py-2">Conf</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {mou.allocations.map(a => {
                const aBadge = STATUS_BADGE[a.status] || STATUS_BADGE.pending
                const AIcon = aBadge.icon
                return (
                  <tr key={a.centreId + a.branchName} className="border-t border-bdr-light/60">
                    <td className="px-3 py-2">
                      <div className="font-medium text-txt-primary">{a.centreId.replace('tc-', '').replace(/\b\w/g, c => c.toUpperCase())}</div>
                      <div className="text-[10px] text-txt-tertiary">{a.branchName}</div>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-txt-secondary">
                      {a.branchContactName || <span className="text-amber-700 italic">awaiting centre</span>}
                      {a.branchContactPhone && <div className="text-[10px] text-txt-tertiary">{a.branchContactPhone}</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.allocated}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{a.confirmed}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold ${aBadge.pill}`}>
                        <AIcon className="w-3 h-3" /> {aBadge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-bdr-light">
        <button onClick={() => onAsk(`Audit the ${mou.employer.name} MoU. Where are we leaking slots between allocation and confirmation? What is the right intervention?`)}
          className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary text-white hover:opacity-90">
          <Sparkles className="w-3 h-3" /> Audit this MoU with Saathi
        </button>
        {mou.status === 'expired' && (
          <button onClick={() => onAsk(`The ${mou.employer.name} MoU expired on ${mou.validityUntil}. Draft a renewal pitch to ${mou.contactPerson.name} and propose new slot terms.`)}
            className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary">
            Renew MoU
          </button>
        )}
        {mou.status === 'draft' && (
          <button onClick={() => onAsk(`Help me finalise the ${mou.employer.name} draft MoU. What's missing? Draft a follow-up to ${mou.contactPerson.name}.`)}
            className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary">
            Finalise draft
          </button>
        )}
      </div>
    </div>
  )
}

// ── Centre-originated row (TP review queue) ──────────────────────────────
// ── Centre plan-override row (TP-visibility) ─────────────────────────────
function PlanOverrideRow({ row, onAsk }) {
  const last = row.lastEdit
  const when = last ? new Date(last.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null
  const total = row.tracks.reduce((s, t) => s + (Number(t.seats) || 0), 0)
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <PencilLine className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-txt-primary">{row.centreName}</div>
          <div className="text-[11px] text-txt-secondary">
            Current plan: <b className="text-txt-primary">{total} trainees</b> across {row.tracks.length} tracks
            {last && (
              <>
                {' · '}
                last edit by <b className="text-txt-primary">{last.actor?.name || 'Centre head'}</b>
                {' · '}
                <span className="text-txt-tertiary">{when}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setOpen(v => !v)}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-white border border-bdr text-txt-primary hover:border-amber-400">
            <History className="w-3 h-3" /> {open ? 'Hide' : 'Show'} history ({row.auditEvents.length})
          </button>
          <button onClick={() => onAsk(`Centre ${row.centreName} has edited their planned-enrolment plan. Their new plan total is ${total} trainees. Review the audit history and tell me whether this looks reasonable given the allocations we've sent them.`)}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary">
            <Sparkles className="w-3 h-3" /> Audit with Saathi
          </button>
        </div>
      </div>

      {/* Current tracks */}
      <div className="mt-2 pl-7 flex flex-wrap gap-1">
        {row.tracks.map((t, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-pill bg-amber-50 text-amber-900 border border-amber-200">
            {t.role}: <b>{t.seats}</b>
          </span>
        ))}
      </div>

      {/* Audit history (expandable) */}
      {open && row.auditEvents.length > 0 && (
        <div className="mt-3 pl-7 space-y-2">
          {row.auditEvents.slice(0, 5).map(ev => {
            const evTime = new Date(ev.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            return (
              <div key={ev.id} className="rounded-lg border border-bdr-light bg-surface-page/40 p-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span><b className="text-txt-primary">{ev.actor?.name || 'Centre head'}</b> · {ev.actor?.role}</span>
                  <span className="text-txt-tertiary">{evTime}</span>
                </div>
                <div className="text-[10px] text-txt-secondary mt-0.5">
                  Total {ev.totalBefore} → <b className="text-txt-primary">{ev.totalAfter}</b>
                  {ev.kind === 'reset' && <span className="ml-2 text-amber-700">(reset to seed defaults)</span>}
                </div>
                {ev.changes.length > 0 && (
                  <ul className="text-[10px] text-txt-secondary mt-1 space-y-0.5">
                    {ev.changes.slice(0, 6).map((c, i) => (
                      <li key={i}>
                        <span className={`inline-block w-14 text-[9px] font-bold uppercase ${
                          c.type === 'added'     ? 'text-emerald-700' :
                          c.type === 'removed'   ? 'text-rose-700' :
                          c.type === 'increased' ? 'text-sky-700' :
                                                   'text-amber-700'
                        }`}>{c.type}</span>
                        <span>{c.role}</span>
                        {c.type !== 'added' && c.type !== 'removed' && <span className="text-txt-tertiary"> ({c.before} → {c.after})</span>}
                        {c.type === 'added'   && <span className="text-txt-tertiary"> (+{c.after})</span>}
                        {c.type === 'removed' && <span className="text-txt-tertiary"> (was {c.before})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
          {row.auditEvents.length > 5 && (
            <div className="text-[10px] text-txt-tertiary italic">+ {row.auditEvents.length - 5} older entries</div>
          )}
        </div>
      )}
    </div>
  )
}

function CentreOriginatedRow({ row, onAccept, onDecline }) {
  const isPending = row.status === 'pending_hq_review'
  const isAccepted = row.status === 'hq_accepted'
  const isDeclined = row.status === 'hq_declined'
  return (
    <div className={`rounded-xl border ${isPending ? 'border-fuchsia-300 bg-white' : isAccepted ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'} p-3`}>
      <div className="flex items-start gap-3">
        <ArrowUpRight className="w-4 h-4 text-fuchsia-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-txt-primary">{row.employerName}</div>
          <div className="text-[11px] text-txt-secondary">{row.role} · NSQF L{row.nsqfLevel} · {row.sector}</div>
          <div className="text-[11px] text-txt-tertiary mt-0.5">
            <b>{row.slots} slots</b> · ₹{row.ctcMonthly?.min?.toLocaleString('en-IN')}–{row.ctcMonthly?.max?.toLocaleString('en-IN')} / mo
            {row.branchName && ` · ${row.branchName}`}
          </div>
          <div className="text-[10px] text-txt-tertiary mt-0.5">
            From <b>{row.centreName}</b> · logged {row.createdAt}
            {row.branchContactName && ` · contact: ${row.branchContactName}`}
            {row.branchContactPhone && ` ${row.branchContactPhone}`}
          </div>
          {row.skillDemandSheet?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {row.skillDemandSheet.slice(0, 4).map(s => (
                <span key={s.rank} className="text-[10px] px-2 py-0.5 rounded-pill bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
                  #{s.rank} {s.skill}
                </span>
              ))}
              {row.skillDemandSheet.length > 4 && (
                <span className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-page text-txt-secondary border border-bdr-light">
                  + {row.skillDemandSheet.length - 4} more
                </span>
              )}
            </div>
          )}
          {row.statusNote && !isPending && (
            <div className="text-[11px] text-txt-secondary mt-1 italic">{isAccepted ? '✓' : '✗'} {row.statusNote}</div>
          )}
        </div>
        {isPending && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button onClick={onAccept}
              className="text-[11px] px-2.5 py-1 rounded-pill bg-emerald-600 text-white font-bold inline-flex items-center gap-1 hover:opacity-90">
              <CheckCircle2 className="w-3 h-3" /> Accept
            </button>
            <button onClick={onDecline}
              className="text-[11px] px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary inline-flex items-center gap-1 hover:border-rose-400">
              <X className="w-3 h-3" /> Decline
            </button>
          </div>
        )}
        {!isPending && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold flex-shrink-0 ${isAccepted ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
            {isAccepted ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {isAccepted ? 'Accepted' : 'Declined'}
          </span>
        )}
      </div>
    </div>
  )
}

const STATUS_BADGE = {
  active:    { icon: CheckCircle2, label: 'Active',    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  draft:     { icon: Clock,        label: 'Draft',     pill: 'bg-amber-100 text-amber-800 border-amber-200' },
  expired:   { icon: X,            label: 'Expired',   pill: 'bg-rose-100 text-rose-800 border-rose-200' },
  confirmed: { icon: CheckCircle2, label: 'Confirmed', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending:   { icon: Clock,        label: 'Pending',   pill: 'bg-amber-100 text-amber-800 border-amber-200' },
  declined:  { icon: X,            label: 'Declined',  pill: 'bg-rose-100 text-rose-800 border-rose-200' },
}

const TINY_TONES = {
  primary: 'text-primary-dark',
  emerald: 'text-emerald-700',
  amber:   'text-amber-700',
  sky:     'text-sky-700',
}
function KpiTiny({ label, value, tone = 'primary' }) {
  return (
    <div className="text-center bg-surface-page/40 rounded-lg px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[14px] font-bold leading-tight ${TINY_TONES[tone] || TINY_TONES.primary}`}>{value}</div>
    </div>
  )
}
const SLOT_PILL_TONE = {
  primary: 'bg-primary-light/40 text-primary-dark border-primary/30',
  sky:     'bg-sky-50           text-sky-700      border-sky-200',
  emerald: 'bg-emerald-50       text-emerald-700  border-emerald-200',
  amber:   'bg-amber-50         text-amber-700    border-amber-200',
}
function SlotPill({ label, sub, value, tone = 'primary' }) {
  const t = SLOT_PILL_TONE[tone] || SLOT_PILL_TONE.primary
  return (
    <div className={`rounded-lg border ${t} px-2 py-1.5 text-center`}>
      <div className="text-[9px] uppercase tracking-wider font-bold opacity-70 truncate" title={label}>{label}</div>
      <div className="text-[16px] font-bold leading-tight tabular-nums">{value.toLocaleString('en-IN')}</div>
      <div className="text-[9px] opacity-60 truncate" title={sub}>{sub}</div>
    </div>
  )
}

function Meta({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-surface-page/40 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary inline-flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-[11px] font-medium text-txt-primary truncate">{value}</div>
    </div>
  )
}

// ── Add MoU modal ────────────────────────────────────────────────────────
function AddMouModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    employerName: '',
    sector: 'BFSI',
    gstin: '',
    role: '',
    nsqfLevel: 4,
    totalSlots: 60,
    ctcMin: 16_000,
    ctcMax: 20_000,
    validityFrom: '',
    validityUntil: '',
    contactName: '',
    contactRole: '',
    contactPhone: '',
    contactEmail: '',
    signedLetterStub: '',
    skillsRaw: '',
    allocationsRaw: '', // free text — one per line: `centre,slots`
  })
  const set = (k) => (v) => setForm(s => ({ ...s, [k]: v }))
  const valid = form.employerName.trim() && form.role.trim() && Number(form.totalSlots) > 0 && form.contactName.trim()

  function submit() {
    if (!valid) return
    const skillDemandSheet = form.skillsRaw
      .split('\n').map(s => s.trim()).filter(Boolean)
      .map((skill, i) => ({ rank: i + 1, skill }))

    // Parse allocations: lines like "tc-patna,20" or "patna,20"
    const allocations = form.allocationsRaw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [centreToken, slotsRaw] = line.split(',').map(s => s.trim())
      const slots = Number(slotsRaw) || 0
      const match = CENTRES.find(c => c.id === centreToken || c.id.endsWith(`-${centreToken.toLowerCase()}`) || c.city.toLowerCase() === centreToken.toLowerCase())
      if (!match || !slots) return null
      return {
        centreId: match.id,
        branchName: '',
        branchContactName: '',
        branchContactPhone: '',
        allocated: slots,
        confirmed: 0,
        status: 'pending',
      }
    }).filter(Boolean)

    onSubmit({
      employer: { name: form.employerName.trim(), gstin: form.gstin.trim() || '—', sector: form.sector.trim(), tone: 'primary' },
      role: form.role.trim(),
      nsqfLevel: Number(form.nsqfLevel) || 4,
      totalSlots: Number(form.totalSlots),
      ctcMonthly: { min: Number(form.ctcMin) || 0, max: Number(form.ctcMax) || 0 },
      signedLetterStub: form.signedLetterStub.trim() || '(not uploaded)',
      signedLetterParsedSlots: null,
      validityFrom: form.validityFrom || '',
      validityUntil: form.validityUntil || '',
      contactPerson: {
        name: form.contactName.trim(),
        role: form.contactRole.trim(),
        phone: form.contactPhone.trim(),
        email: form.contactEmail.trim(),
      },
      status: 'active',
      skillDemandSheet,
      allocations,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-bdr-light flex items-center justify-between sticky top-0 bg-white">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-sky-700">New national MoU</div>
            <div className="text-[14px] font-bold text-txt-primary mt-0.5">Add employer commitment</div>
            <div className="text-[10px] text-txt-tertiary">After saving, allocations appear on the relevant centres' Demand Boards.</div>
          </div>
          <button onClick={onClose} className="text-txt-tertiary hover:text-txt-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <FormSection title="Employer">
            <FormField label="Employer name *" value={form.employerName} onChange={set('employerName')} placeholder="e.g. Bharti Airtel" />
            <FormField label="Sector" value={form.sector} onChange={set('sector')} placeholder="e.g. Telecom" />
            <FormField label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="15-char GSTIN" />
          </FormSection>

          <FormSection title="Role + slots">
            <FormField label="Job role *" value={form.role} onChange={set('role')} placeholder="e.g. Customer Service Associate" />
            <FormField label="NSQF level" type="number" value={form.nsqfLevel} onChange={set('nsqfLevel')} />
            <FormField label="Total slots *" type="number" value={form.totalSlots} onChange={set('totalSlots')} />
          </FormSection>

          <FormSection title="Compensation">
            <FormField label="CTC monthly · min (₹)" type="number" value={form.ctcMin} onChange={set('ctcMin')} />
            <FormField label="CTC monthly · max (₹)" type="number" value={form.ctcMax} onChange={set('ctcMax')} />
          </FormSection>

          <FormSection title="Validity & document">
            <FormField label="Valid from" type="date" value={form.validityFrom} onChange={set('validityFrom')} />
            <FormField label="Valid until" type="date" value={form.validityUntil} onChange={set('validityUntil')} />
            <FormField label="Signed letter file" value={form.signedLetterStub} onChange={set('signedLetterStub')} placeholder="e.g. Airtel-MoU-Q3.pdf" />
          </FormSection>

          <FormSection title="Employer HQ contact">
            <FormField label="Contact name *" value={form.contactName} onChange={set('contactName')} placeholder="e.g. Vandana Kapoor" />
            <FormField label="Contact role" value={form.contactRole} onChange={set('contactRole')} placeholder="e.g. Retail Operations Head" />
            <FormField label="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+91 …" />
          </FormSection>
          <div>
            <div className="text-[10px] text-txt-secondary mb-0.5">Contact email</div>
            <input value={form.contactEmail} onChange={e => set('contactEmail')(e.target.value)} placeholder="hr@employer.com"
              className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-sky-400" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">Employer-ranked skills (one per line, ordered)</div>
            <textarea value={form.skillsRaw} onChange={e => set('skillsRaw')(e.target.value)}
              rows={5}
              placeholder={'SIM activation + KYC compliance\nPlan recommendation\nIn-store complaint resolution\nCross-sell — DTH, broadband\nDaily sales reporting'}
              className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-sky-400 font-mono" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">Initial allocations to centres (one per line · format: `centre, slots`)</div>
            <textarea value={form.allocationsRaw} onChange={e => set('allocationsRaw')(e.target.value)}
              rows={4}
              placeholder={'patna, 25\nlucknow, 30\nbhopal, 20'}
              className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-sky-400 font-mono" />
            <div className="text-[10px] text-txt-tertiary mt-1">
              Use the centre city (patna, lucknow…) or the full id (tc-patna…). Slots stay `pending` until each centre confirms with its local branch.
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-bdr-light flex items-center justify-between bg-surface-page/40 sticky bottom-0">
          <div className="text-[11px] text-txt-secondary">Required fields marked with *</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[12px] px-3 py-1.5 rounded-pill text-txt-secondary">Cancel</button>
            <button onClick={submit} disabled={!valid}
              className="text-[12px] px-3 py-1.5 rounded-pill bg-sky-600 text-white font-bold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Save MoU
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Edit skills modal (drag-free reorder: up/down + add/remove) ──────────
function EditSkillsModal({ mou, onClose, onSave }) {
  const [skills, setSkills] = useState(() => mou.skillDemandSheet.map(s => s.skill))
  const [draft, setDraft] = useState('')

  const move = (i, dir) => {
    const next = [...skills]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSkills(next)
  }
  const remove = (i) => setSkills(s => s.filter((_, idx) => idx !== i))
  const add = () => {
    if (!draft.trim()) return
    setSkills(s => [...s, draft.trim()])
    setDraft('')
  }
  const save = () => onSave(skills.map((skill, i) => ({ rank: i + 1, skill })))

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-bdr-light flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-sky-700">Edit skill demand sheet</div>
            <div className="text-[14px] font-bold text-txt-primary mt-0.5">{mou.employer.name} · {mou.role}</div>
            <div className="text-[10px] text-txt-tertiary">Drag positions reorder rank. Top = most critical to the employer.</div>
          </div>
          <button onClick={onClose} className="text-txt-tertiary hover:text-txt-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {skills.map((skill, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-bdr-light bg-white p-2">
              <GripVertical className="w-4 h-4 text-txt-tertiary" />
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold inline-flex items-center justify-center text-[10px]">{i + 1}</span>
              <input value={skill} onChange={e => setSkills(s => s.map((x, idx) => idx === i ? e.target.value : x))}
                className="flex-1 bg-transparent outline-none text-[12px]" />
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-page hover:bg-slate-200 disabled:opacity-30">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === skills.length - 1}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-page hover:bg-slate-200 disabled:opacity-30">↓</button>
              <button onClick={() => remove(i)} className="text-rose-700 hover:bg-rose-50 rounded p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <input value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="Add a new skill…"
              className="flex-1 rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-sky-400" />
            <button onClick={add} disabled={!draft.trim()}
              className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-pill bg-sky-600 text-white font-bold hover:opacity-90 disabled:opacity-40">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-bdr-light flex items-center justify-end gap-2 bg-surface-page/40">
          <button onClick={onClose} className="text-[12px] px-3 py-1.5 rounded-pill text-txt-secondary">Cancel</button>
          <button onClick={save}
            className="text-[12px] px-3 py-1.5 rounded-pill bg-sky-600 text-white font-bold hover:opacity-90 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Save sheet
          </button>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{children}</div>
    </div>
  )
}
function FormField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <div className="text-[10px] text-txt-secondary mb-0.5">{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-sky-400" />
    </label>
  )
}
