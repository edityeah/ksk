// Demand Board · Training Centre surface
//
// What the centre head sees: the slice of every TP-level MoU that has been
// allocated to THIS centre. For each allocation the centre must:
//   • Name the local branch contact (so KSK can ping the branch directly)
//   • Confirm the slot count (or decline with a reason)
//   • Maintain the validity by re-confirming every 30 days
//
// At the top of the screen: the centre-level demand ratio against planned
// enrolment. Target ≥ 1.5×. Below 1.0× will block new batch creation
// at this centre — that's the gate that prevents the #1 failure mode
// (batches starting with no employer commitments lined up).
//
// Defaults to Magic Bus Patna Centre (Sunita Devi's login).

import { useEffect, useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { TP_PROFILE } from './_tp/data.js'
import {
  EMPLOYER_COMMITMENTS, computeCentreSummary, ratioBand, PLANNED_ENROLMENT, CENTRES,
  PLANNED_ENROLMENT_TRACKS, centreAllocationByRole, centreDemandAlignment,
  getPlannedTracks, writePlannedTracks, resetPlannedTracks, hasPlanOverride,
  auditForCentre,
  readCentreSecured, addCentreSecured, readPings, setPing,
} from './_demand/data.js'
import TcDrilldownPage from './_demand/TcDrilldownPage.jsx'
import {
  Handshake, MapPin, Building2, CheckCircle2, Clock, X, AlertTriangle,
  Sparkles, Phone, ShieldCheck, ChevronRight, ListChecks, Plus, Upload,
  HelpCircle, FileSignature, MessageCircle, Send, MessageSquare,
  Layers, BookOpen, BarChart3, Target, Edit3, Trash2,
} from 'lucide-react'

const QUICK_ASKS = [
  'What\'s blocking us from starting Q3 batches?',
  'Why are we below the 1.5× demand ratio?',
  'Draft a follow-up to the HDFC Boring Road branch to top up slots',
  'Walk me through what the HR contact at HDFC asked me to do',
  'Which allocations need my action today?',
  'Build a 7-day demand-coverage plan for this centre',
  'Show me the Reliance Retail skill demand sheet',
  'Send an alert to TP HQ that we need 20 more slots in BFSI',
]

// Quick centre picker — in production the TC role would only see their own
// centre, but for the demo we let the user toggle so we can show several.
const PICKABLE_CENTRES = ['tc-patna', 'tc-bhopal', 'tc-guwahati', 'tc-jaipur', 'tc-lucknow']

export default function TcDemandBoardCanvas({ context }) {
  const { showToast } = useApp() || {}
  const [pending, setPending] = useState(null)
  const [centreId, setCentreId] = useState('tc-patna')
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  // Local optimistic confirmations — keeps a session-only view of what the
  // centre head has just clicked "confirm" on. Real impl would POST to API.
  const [localConfirms, setLocalConfirms] = useState({}) // key: `${mouId}|${centreId}|${branch}` → { confirmed, contactName, contactPhone, status: 'confirmed' }

  // Centre-secured demand — local employer commitments logged by this centre.
  // Read from localStorage; updates fan out via 'ksk:demand-changed' event.
  const [centreSecured, setCentreSecured] = useState(() => readCentreSecured())
  // Refresh-key — bumped whenever any demand-related storage changes. Drives
  // useMemo recomputation for summary, alignment, etc.
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    const refresh = () => {
      setCentreSecured(readCentreSecured())
      setRefreshKey(k => k + 1)
    }
    window.addEventListener('ksk:demand-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('ksk:demand-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const [showLogForm, setShowLogForm] = useState(false)
  const [drilldown, setDrilldown] = useState(null) // null | 'planned' | 'allocated' | 'confirmed' | 'ratio'

  const summary = useMemo(() => computeCentreSummary(centreId), [centreId, refreshKey])
  const centre = CENTRES.find(c => c.id === centreId)
  const mySecured = centreSecured.filter(r => r.centreId === centreId)

  // Apply local confirmations on top of fixture allocations.
  const incoming = useMemo(() => summary.incoming.map(({ mou, allocation }) => {
    const key = `${mou.id}|${allocation.centreId}|${allocation.branchName}`
    const local = localConfirms[key]
    if (local) return { mou, allocation: { ...allocation, ...local } }
    return { mou, allocation }
  }), [summary.incoming, localConfirms])

  // Recompute with locals applied
  const adjusted = useMemo(() => {
    let confirmed = 0, allocated = 0, pending = 0
    for (const { allocation: a } of incoming) {
      allocated += a.allocated
      confirmed += a.confirmed
      if (a.status === 'pending') pending++
    }
    const ratio = summary.plannedEnrol ? confirmed / summary.plannedEnrol : 0
    return { confirmed, allocated, pending, ratio }
  }, [incoming, summary.plannedEnrol])

  // Pull centre-secured slot counts into the totals (only rows that HQ has
  // accepted count toward "confirmed"; pending ones are shown separately).
  const securedAccepted = mySecured.filter(r => r.status === 'hq_accepted')
  const securedPending  = mySecured.filter(r => r.status === 'pending_hq_review')
  const securedAcceptedSlots = securedAccepted.reduce((s, r) => s + (Number(r.slots) || 0), 0)

  const totalConfirmed = adjusted.confirmed + securedAcceptedSlots
  const totalRatio = summary.plannedEnrol ? totalConfirmed / summary.plannedEnrol : 0
  const band = ratioBand(totalRatio)
  const batchGate = totalRatio < 1.0

  const kpiCard = {
    title: `Q3 demand health · ${centre?.name || centreId}`,
    items: [
      { label: 'Planned enrolment',  value: summary.plannedEnrol.toLocaleString('en-IN'), tone: 'sky',
        hint: 'Click to see the track breakdown',
        onClick: () => setDrilldown('planned') },
      { label: 'Slots allocated by HQ', value: adjusted.allocated.toLocaleString('en-IN'), tone: 'primary',
        hint: 'Click to see distribution by role + employer',
        onClick: () => setDrilldown('allocated') },
      { label: 'Slots confirmed',    value: totalConfirmed.toLocaleString('en-IN'), tone: 'emerald',
        hint: 'Click to see what got back-confirmed by branch',
        onClick: () => setDrilldown('confirmed') },
      { label: 'Demand ratio',       value: totalRatio ? `${totalRatio.toFixed(2)}×` : '—', delta: band.label, tone: band.tone,
        hint: 'Click to see ratio per track',
        onClick: () => setDrilldown('ratio') },
      { label: 'Awaiting your action', value: adjusted.pending.toString(), tone: 'amber',
        hint: 'HQ allocations waiting for you to confirm with the branch' },
      { label: 'Awaiting HQ review',  value: securedPending.length.toString(), tone: 'violet',
        hint: 'Local employers you logged, sent up to HQ for approval' },
    ],
  }

  function confirmAllocation(mou, alloc, payload) {
    const key = `${mou.id}|${alloc.centreId}|${alloc.branchName}`
    setLocalConfirms(prev => ({
      ...prev,
      [key]: {
        confirmed: Number(payload.confirmed) || alloc.allocated,
        branchContactName: payload.branchContactName || alloc.branchContactName,
        branchContactPhone: payload.branchContactPhone || alloc.branchContactPhone,
        status: 'confirmed',
        confirmedAt: new Date().toISOString().slice(0, 10),
      },
    }))
    showToast?.({ kind: 'success', text: `Confirmed ${payload.confirmed || alloc.allocated} slots with ${mou.employer.name}` })
  }
  function declineAllocation(mou, alloc, reason) {
    const key = `${mou.id}|${alloc.centreId}|${alloc.branchName}`
    setLocalConfirms(prev => ({
      ...prev,
      [key]: { confirmed: 0, status: 'declined', declineReason: reason },
    }))
    showToast?.({ kind: 'info', text: `Declined ${mou.employer.name} allocation — flagged for TP HQ` })
  }

  const dashboard = (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-emerald-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-700 inline-flex items-center gap-1">
          <Handshake className="w-3 h-3" /> Training Centre · Demand
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">Demand Board — {centre?.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{centre?.city}, {centre?.state}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />Operates under {TP_PROFILE.name}</span>
        </div>

        {/* Centre picker (demo affordance) */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary">Demo: switch centre</span>
          {PICKABLE_CENTRES.map(id => {
            const c = CENTRES.find(x => x.id === id)
            return (
              <button key={id} onClick={() => setCentreId(id)}
                className={`text-[11px] px-2.5 py-1 rounded-pill border ${centreId === id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-bdr text-txt-secondary hover:border-emerald-400'}`}>
                {c?.city}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Batch-creation gate */}
        {batchGate && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-rose-800">
                Batch creation BLOCKED — demand ratio {adjusted.ratio.toFixed(2)}× is below 1.0×
              </div>
              <div className="text-[11px] text-rose-800/80 mt-0.5">
                Programme rule: a centre cannot start a new batch unless it has confirmed at least 1.0× employer commitments against planned enrolment.
                Confirm pending allocations or request more from TP HQ.
              </div>
            </div>
            <button onClick={() => askSaathi(`This centre's demand ratio is ${adjusted.ratio.toFixed(2)}×, blocking new batches. Diagnose where the shortfall is and recommend 3 specific actions I can take this week.`)}
              className="px-3 py-1.5 rounded-pill bg-rose-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
              <Sparkles className="w-3 h-3" /> Get recovery plan
            </button>
          </div>
        )}
        {!batchGate && adjusted.ratio < 1.5 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-amber-800">
                Demand ratio {adjusted.ratio.toFixed(2)}× is below the 1.5× target
              </div>
              <div className="text-[11px] text-amber-800/80">
                You can start batches, but Best practice says you should secure 1.5× before kickoff to absorb employer cancellations.
              </div>
            </div>
          </div>
        )}

        <KpiGridCard card={kpiCard} />

        {/* Action bar: log local demand */}
        <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-white p-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-txt-primary inline-flex items-center gap-1.5">
              <FileSignature className="w-4 h-4 text-emerald-700" />
              Signed a local employer directly?
            </div>
            <div className="text-[11px] text-txt-secondary mt-0.5">
              Log it here — it flows up to TP HQ for review and adds to your centre's demand pool.
              <span className="ml-1 text-emerald-700">{mySecured.length} logged so far · {securedPending.length} awaiting HQ review.</span>
            </div>
          </div>
          <button onClick={() => setShowLogForm(true)}
            className="px-3 py-2 rounded-pill bg-emerald-600 text-white text-[12px] font-bold inline-flex items-center gap-1.5 hover:opacity-90 flex-shrink-0">
            <Plus className="w-4 h-4" /> Log local demand
          </button>
        </div>

        {/* Modal: log local demand */}
        {showLogForm && (
          <LogLocalDemandModal
            centreId={centreId}
            centreName={centre?.name}
            onClose={() => setShowLogForm(false)}
            onSubmit={(payload) => {
              const row = addCentreSecured({ ...payload, centreId, centreName: centre?.name })
              setCentreSecured(readCentreSecured())
              showToast?.({ kind: 'success', text: `Logged ${row.slots} slots from ${row.employerName} — sent to HQ for review` })
              setShowLogForm(false)
            }}
          />
        )}

        {/* Centre-secured list */}
        {mySecured.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 mb-2 inline-flex items-center gap-1">
              <FileSignature className="w-3 h-3" /> Your local employer commitments ({mySecured.length})
            </div>
            <div className="space-y-2">
              {mySecured.map(r => (
                <SecuredRow key={r.id} row={r} />
              ))}
            </div>
          </div>
        )}

        {/* Incoming allocations */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 mb-2 inline-flex items-center gap-1">
            <ListChecks className="w-3 h-3" /> Incoming allocations from TP HQ ({incoming.length})
          </div>
          <div className="space-y-3">
            {incoming.map(({ mou, allocation }) => (
              <AllocationCard
                key={`${mou.id}-${allocation.branchName}`}
                mou={mou}
                allocation={allocation}
                onConfirm={(payload) => confirmAllocation(mou, allocation, payload)}
                onDecline={(reason) => declineAllocation(mou, allocation, reason)}
                onAsk={askSaathi}
              />
            ))}
            {incoming.length === 0 && (
              <div className="rounded-2xl border border-dashed border-bdr-light p-6 text-center text-[12px] text-txt-secondary">
                No incoming allocations. Ask TP HQ to surface MoUs for this centre.
              </div>
            )}
          </div>
        </div>

        {/* Request more from HQ */}
        <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-emerald-50/40 to-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-txt-primary">Need more demand?</div>
            <div className="text-[11px] text-txt-secondary">Ping TP HQ with a specific sector / role and the slot count you need. Saathi drafts the message.</div>
          </div>
          <button onClick={() => askSaathi(`I need to request additional Q3 demand from TP HQ for ${centre?.name}. Current confirmed: ${adjusted.confirmed}, planned enrolment: ${summary.plannedEnrol}. Draft a precise ask — sectors, roles, slot counts — based on what's lacking.`)}
            className="px-3 py-1.5 rounded-pill bg-emerald-600 text-white text-[12px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
            <Sparkles className="w-3 h-3" /> Draft HQ request
          </button>
        </div>
      </div>

    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · Demand Board"
      useWebSearch={false}
      extraSystem={
        `You are inside the DEMAND BOARD (centre view) for ${centre?.name}. ` +
        `Planned enrolment ${summary.plannedEnrol}, confirmed ${adjusted.confirmed}, allocated ${adjusted.allocated}, ratio ${adjusted.ratio.toFixed(2)}×. ` +
        `Operating under ${TP_PROFILE.name}. ` +
        "The leading signal we capture is the pre-batch employer commitment ratio (target ≥ 1.5×, below 1.0× blocks batch creation). " +
        "Help the centre head close the gap: confirm pending allocations, request more from TP HQ, follow up with the named branch contacts. " +
        "Emit ONE chart card per analytic answer and an action_panel with concrete next steps when relevant. " +
        "If the user asks about training, mentorship, or placement, suggest opening those modules — but for now focus on demand."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={QUICK_ASKS}
    />
  )

  const top = drilldown
    ? <TcDrilldownPage
        view={drilldown}
        centre={centre}
        summary={summary}
        totalConfirmed={totalConfirmed}
        totalRatio={totalRatio}
        version={refreshKey}
        isOverridden={hasPlanOverride(centreId)}
        onBack={() => setDrilldown(null)}
        onSavePlan={(tracks) => {
          writePlannedTracks(centreId, tracks, { name: 'Sunita Devi', role: 'training_centre', centre: centre?.name })
          showToast?.({ kind: 'success', text: `Updated plan for ${centre?.name} — ratio recomputed · TP HQ notified` })
        }}
        onResetPlan={() => {
          resetPlannedTracks(centreId, { name: 'Sunita Devi', role: 'training_centre', centre: centre?.name })
          showToast?.({ kind: 'info', text: `Reset plan for ${centre?.name} to seed defaults` })
        }}
      />
    : dashboard

  return <ResizableSaathiSplit top={top} bottom={chat} />
}

// ── Allocation card (one per incoming MoU slice) ─────────────────────────
function AllocationCard({ mou, allocation, onConfirm, onDecline, onAsk }) {
  const [editing, setEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(allocation.allocated)
  const [contactName, setContactName] = useState(allocation.branchContactName || '')
  const [contactPhone, setContactPhone] = useState(allocation.branchContactPhone || '')
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // WhatsApp ping state — stored in localStorage, persists across canvas reloads.
  const pingKey = `${mou.id}|${allocation.centreId}|${allocation.branchName}`
  const [ping, setPingState] = useState(() => readPings()[pingKey])
  useEffect(() => {
    const refresh = () => setPingState(readPings()[pingKey])
    window.addEventListener('ksk:demand-changed', refresh)
    return () => window.removeEventListener('ksk:demand-changed', refresh)
  }, [pingKey])
  const [showPingPanel, setShowPingPanel] = useState(false)
  const [responseSlots, setResponseSlots] = useState(allocation.allocated)
  const [responseName, setResponseName] = useState(allocation.branchContactName || '')

  function sendPing() {
    const sentAt = new Date().toISOString()
    setPing(pingKey, { status: 'awaiting', sentAt })
    setPingState({ status: 'awaiting', sentAt })
  }
  function simulateResponse(accept) {
    if (accept) {
      const respondedAt = new Date().toISOString()
      const name = responseName.trim() || 'Branch contact'
      setPing(pingKey, { status: 'responded', accepted: true, respondedAt, confirmedSlots: Number(responseSlots), branchContactName: name })
      setPingState({ status: 'responded', accepted: true, respondedAt, confirmedSlots: Number(responseSlots), branchContactName: name })
      // Auto-confirm the allocation from the simulated WhatsApp reply.
      onConfirm({ confirmed: Number(responseSlots), branchContactName: name, branchContactPhone: allocation.branchContactPhone })
      setShowPingPanel(false)
    } else {
      setPing(pingKey, { status: 'responded', accepted: false, respondedAt: new Date().toISOString() })
      setPingState({ status: 'responded', accepted: false, respondedAt: new Date().toISOString() })
    }
  }

  const sBadge = ALLOC_BADGE[allocation.status] || ALLOC_BADGE.pending
  const SIcon = sBadge.icon
  const ringColor = allocation.status === 'confirmed' ? 'border-emerald-300' : allocation.status === 'declined' ? 'border-rose-300' : 'border-amber-300'

  return (
    <div className={`rounded-2xl border-2 ${ringColor} bg-white shadow-card overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-bdr-light bg-surface-page/30 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-txt-primary">{mou.employer.name}</div>
          <div className="text-[11px] text-txt-secondary">{mou.role} · NSQF L{mou.nsqfLevel} · {mou.employer.sector}</div>
          <div className="text-[11px] text-txt-tertiary mt-0.5">{allocation.branchName}</div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-bold flex-shrink-0 ${sBadge.pill}`}>
          <SIcon className="w-3 h-3" /> {sBadge.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        {(() => {
          const totalAlloc = mou.allocations.reduce((s, a) => s + a.allocated, 0)
          const unalloc = mou.totalSlots - totalAlloc
          const otherCentres = totalAlloc - allocation.allocated
          return (
            <>
              {/* Full slot lifecycle — MoU slots → allocated to me → confirmed.
                  The "Slots" tile is the parent-MoU total commitment from the
                  employer; the rest tells me what got to this centre and what
                  was confirmed locally. */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                <KpiTiny label="Slots in MoU" value={mou.totalSlots} tone="sky" />
                <KpiTiny label="Allocated to me" value={allocation.allocated} />
                <KpiTiny label="Confirmed" value={allocation.confirmed} tone={allocation.confirmed === allocation.allocated ? 'emerald' : 'amber'} />
                <KpiTiny label="CTC band" value={`₹${(mou.ctcMonthly.min/1000).toFixed(0)}–${(mou.ctcMonthly.max/1000).toFixed(0)}K`} />
                <KpiTiny label="Valid till" value={mou.validityUntil.slice(5)} />
              </div>

              {/* Breakdown of the MoU's slot pool — where the rest of the slots are.
                  Helps the centre head see: "Apollo has 130 slots, 25 came to me,
                  90 to other centres, 15 still unallocated — I could ask for more". */}
              <div className="rounded-lg border border-dashed border-bdr-light bg-surface-page/30 p-2 mb-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">
                  Of the {mou.totalSlots} slots in this MoU
                </div>
                <div className="text-[11px] text-txt-secondary inline-flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span><b className="text-txt-primary">{allocation.allocated}</b> sent to this centre</span>
                  <span>·</span>
                  <span><b className="text-txt-primary">{otherCentres}</b> to other centres</span>
                  <span>·</span>
                  <span className={unalloc > 0 ? 'text-amber-700' : 'text-txt-secondary'}>
                    <b>{unalloc}</b> still with HQ {unalloc > 0 && '(unallocated — you could ask for more)'}
                  </span>
                </div>
              </div>
            </>
          )
        })()}

        {/* Branch contact */}
        {allocation.branchContactName ? (
          <div className="rounded-lg border border-bdr-light bg-surface-page/40 p-2.5 mb-3 flex items-center gap-3">
            <Phone className="w-3.5 h-3.5 text-txt-tertiary" />
            <div className="flex-1 text-[12px]">
              <span className="font-bold text-txt-primary">{allocation.branchContactName}</span>
              <span className="text-txt-secondary ml-2">{allocation.branchContactPhone}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 mb-3 text-[11px] text-amber-800 inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Branch contact not yet captured — needed to confirm allocation
          </div>
        )}

        {/* Top-3 skills employer asked for */}
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">
          Top skills employer ranked
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {mou.skillDemandSheet.slice(0, 5).map(s => (
            <span key={s.rank} className="text-[10px] px-2 py-0.5 rounded-pill bg-sky-50 text-sky-800 border border-sky-200">
              #{s.rank} {s.skill}
            </span>
          ))}
          {mou.skillDemandSheet.length > 5 && (
            <span className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-page text-txt-secondary border border-bdr-light">
              + {mou.skillDemandSheet.length - 5} more
            </span>
          )}
        </div>

        {/* Confirm / Decline form (inline) */}
        {editing && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 mb-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-800">Confirm with branch</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <LabelInput label="Slots accepted" type="number" value={confirmed} onChange={setConfirmed} />
              <LabelInput label="Branch contact name" value={contactName} onChange={setContactName} placeholder="Person you spoke to" />
              <LabelInput label="Branch contact phone" value={contactPhone} onChange={setContactPhone} placeholder="+91 …" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => { onConfirm({ confirmed, branchContactName: contactName, branchContactPhone: contactPhone }); setEditing(false) }}
                className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90">
                <CheckCircle2 className="w-3 h-3" /> Confirm allocation
              </button>
              <button onClick={() => setEditing(false)} className="text-[11px] text-txt-secondary">Cancel</button>
            </div>
          </div>
        )}
        {showDecline && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 mb-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-rose-800">Decline allocation — flag for TP HQ</div>
            <LabelInput label="Reason" value={declineReason} onChange={setDeclineReason} placeholder="e.g. Branch not hiring this quarter" />
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => { onDecline(declineReason); setShowDecline(false) }}
                disabled={!declineReason.trim()}
                className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-rose-600 text-white font-bold hover:opacity-90 disabled:opacity-40">
                <X className="w-3 h-3" /> Decline & flag HQ
              </button>
              <button onClick={() => setShowDecline(false)} className="text-[11px] text-txt-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* WhatsApp ping status */}
        {ping && (
          <WhatsAppPingStatus ping={ping}
            onSimulateAccept={() => simulateResponse(true)}
            onSimulateDecline={() => simulateResponse(false)} />
        )}

        {/* WhatsApp ping panel — sliding the message + send affordance */}
        {showPingPanel && !ping && (
          <WhatsAppPingPanel
            mou={mou} allocation={allocation}
            onCancel={() => setShowPingPanel(false)}
            onSend={() => { sendPing(); setShowPingPanel(false) }} />
        )}

        {/* Action row */}
        {!editing && !showDecline && !showPingPanel && (
          <div className="flex items-center gap-2 flex-wrap">
            {allocation.status !== 'confirmed' && allocation.status !== 'declined' && (
              <>
                <button onClick={() => setEditing(true)}
                  className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90">
                  <CheckCircle2 className="w-3 h-3" /> Confirm with branch
                </button>
                {!ping && (
                  <button onClick={() => setShowPingPanel(true)}
                    className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-[#25D366] text-white font-bold hover:opacity-90">
                    <MessageCircle className="w-3 h-3" /> Ping on WhatsApp
                  </button>
                )}
                <button onClick={() => setShowDecline(true)}
                  className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-rose-400">
                  <X className="w-3 h-3" /> Decline
                </button>
              </>
            )}
            {allocation.status === 'confirmed' && (
              <span className="text-[11px] inline-flex items-center gap-1 text-emerald-700 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Confirmed {allocation.confirmedAt && `· ${allocation.confirmedAt}`}
              </span>
            )}
            {allocation.status === 'declined' && (
              <span className="text-[11px] inline-flex items-center gap-1 text-rose-700 font-bold">
                <X className="w-3.5 h-3.5" /> Declined · TP HQ notified
              </span>
            )}
            <button onClick={() => onAsk(`What should I prepare before I call ${mou.contactPerson.name} at ${mou.employer.name} for the ${mou.role} allocation? What are the top skills they want, and how should I pitch our centre's strengths?`)}
              className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary ml-auto">
              <Sparkles className="w-3 h-3" /> Prep call with Saathi <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Show simulate response controls only when awaiting */}
        {ping?.status === 'awaiting' && allocation.status !== 'confirmed' && (
          <div className="mt-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/30 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-800">Simulate employer reply (demo only)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <LabelInput label="Slots they confirmed" type="number" value={responseSlots} onChange={setResponseSlots} />
              <LabelInput label="Who replied" value={responseName} onChange={setResponseName} placeholder="Branch contact name" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => simulateResponse(true)}
                className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90">
                <CheckCircle2 className="w-3 h-3" /> Simulate accept
              </button>
              <button onClick={() => simulateResponse(false)}
                className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-rose-400">
                <X className="w-3 h-3" /> Simulate decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Log local demand modal ───────────────────────────────────────────────
function LogLocalDemandModal({ centreId, centreName, onClose, onSubmit }) {
  const [form, setForm] = useState({
    employerName: '',
    sector: '',
    role: '',
    nsqfLevel: 4,
    slots: 10,
    ctcMin: 14000,
    ctcMax: 18000,
    branchName: '',
    branchContactName: '',
    branchContactPhone: '',
    validityUntil: '',
    signedLetterStub: '',
    skillsRaw: '',
  })
  const set = (k) => (v) => setForm(s => ({ ...s, [k]: v }))

  const valid = form.employerName.trim() && form.role.trim() && Number(form.slots) > 0 && form.branchContactName.trim()

  function submit() {
    if (!valid) return
    onSubmit({
      employerName: form.employerName.trim(),
      sector: form.sector.trim() || 'Unspecified',
      role: form.role.trim(),
      nsqfLevel: Number(form.nsqfLevel) || 4,
      slots: Number(form.slots),
      ctcMonthly: { min: Number(form.ctcMin) || 0, max: Number(form.ctcMax) || 0 },
      branchName: form.branchName.trim(),
      branchContactName: form.branchContactName.trim(),
      branchContactPhone: form.branchContactPhone.trim(),
      validityUntil: form.validityUntil || '',
      signedLetterStub: form.signedLetterStub.trim() || '(not uploaded)',
      skillDemandSheet: form.skillsRaw
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map((skill, i) => ({ rank: i + 1, skill })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-bdr-light flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Log local demand</div>
            <div className="text-[14px] font-bold text-txt-primary mt-0.5">New employer commitment — {centreName}</div>
            <div className="text-[10px] text-txt-tertiary">Will go to TP HQ for review before counting toward your demand ratio.</div>
          </div>
          <button onClick={onClose} className="text-txt-tertiary hover:text-txt-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Section title="Employer">
            <Field label="Employer name *" value={form.employerName} onChange={set('employerName')} placeholder="e.g. Apollo Patliputra Hospital" />
            <Field label="Sector" value={form.sector} onChange={set('sector')} placeholder="e.g. Healthcare" />
          </Section>

          <Section title="Role">
            <Field label="Job role *" value={form.role} onChange={set('role')} placeholder="e.g. General Duty Assistant" />
            <Field label="NSQF level" type="number" value={form.nsqfLevel} onChange={set('nsqfLevel')} />
            <Field label="Slots committed *" type="number" value={form.slots} onChange={set('slots')} />
          </Section>

          <Section title="Compensation">
            <Field label="CTC monthly · min (₹)" type="number" value={form.ctcMin} onChange={set('ctcMin')} />
            <Field label="CTC monthly · max (₹)" type="number" value={form.ctcMax} onChange={set('ctcMax')} />
          </Section>

          <Section title="Local branch">
            <Field label="Branch / office name" value={form.branchName} onChange={set('branchName')} placeholder="e.g. Apollo, Boring Road" />
            <Field label="Contact person *" value={form.branchContactName} onChange={set('branchContactName')} placeholder="HR / hiring lead at the branch" />
            <Field label="Contact phone" value={form.branchContactPhone} onChange={set('branchContactPhone')} placeholder="+91 …" />
          </Section>

          <Section title="Validity & document">
            <Field label="Valid until" type="date" value={form.validityUntil} onChange={set('validityUntil')} />
            <Field label="Signed letter file name" value={form.signedLetterStub} onChange={set('signedLetterStub')} placeholder="e.g. Apollo-Patna-Demand.pdf" />
          </Section>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">Employer-ranked skills (one per line)</div>
            <textarea value={form.skillsRaw} onChange={e => set('skillsRaw')(e.target.value)}
              rows={5}
              placeholder={'Patient hygiene + bed-making\nVital-sign measurement\nInfection control + PPE\nBedside communication'}
              className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-400 font-mono" />
            <div className="text-[10px] text-txt-tertiary mt-1">This feeds into the curriculum-employer alignment score downstream.</div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-bdr-light flex items-center justify-between bg-surface-page/40">
          <div className="text-[11px] text-txt-secondary inline-flex items-center gap-1">
            <Upload className="w-3 h-3" /> Required fields marked with *
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[12px] px-3 py-1.5 rounded-pill text-txt-secondary">Cancel</button>
            <button onClick={submit} disabled={!valid}
              className="text-[12px] px-3 py-1.5 rounded-pill bg-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Send to HQ for review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{children}</div>
    </div>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <div className="text-[10px] text-txt-secondary mb-0.5">{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-bdr bg-white px-2 py-1.5 text-[12px] outline-none focus:border-emerald-400" />
    </label>
  )
}

// ── Centre-secured row (your own logged commitments) ──────────────────────
function SecuredRow({ row }) {
  const s = SECURED_STATUS[row.status] || SECURED_STATUS.pending_hq_review
  const SIcon = s.icon
  return (
    <div className="rounded-xl border border-bdr-light bg-white p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-[13px] text-txt-primary">{row.employerName}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill border text-[10px] font-bold ${s.pill}`}>
            <SIcon className="w-3 h-3" /> {s.label}
          </span>
        </div>
        <div className="text-[11px] text-txt-secondary">{row.role} · NSQF L{row.nsqfLevel} · {row.sector}</div>
        <div className="text-[11px] text-txt-tertiary mt-0.5">
          {row.slots} slots · ₹{row.ctcMonthly?.min?.toLocaleString('en-IN')}–{row.ctcMonthly?.max?.toLocaleString('en-IN')} / mo
          {row.branchContactName && ` · ${row.branchContactName}`}
          {row.validityUntil && ` · valid till ${row.validityUntil}`}
        </div>
        {row.statusNote && (
          <div className="text-[11px] text-txt-secondary mt-1 italic">HQ: {row.statusNote}</div>
        )}
      </div>
    </div>
  )
}

const SECURED_STATUS = {
  pending_hq_review: { icon: Clock,        label: 'Awaiting HQ review', pill: 'bg-violet-100 text-violet-800 border-violet-200' },
  hq_accepted:       { icon: CheckCircle2, label: 'HQ accepted',        pill: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  hq_declined:       { icon: X,            label: 'HQ declined',        pill: 'bg-rose-100 text-rose-800 border-rose-200' },
}

// ── WhatsApp ping panel (message preview + send) ─────────────────────────
function WhatsAppPingPanel({ mou, allocation, onCancel, onSend }) {
  // Compose a plain-text message preview that mimics what the branch contact
  // will see on WhatsApp. This is just the rendered preview; actual delivery
  // would go through SwiftChat in a real impl.
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const topSkills = mou.skillDemandSheet.slice(0, 3).map(s => `• ${s.skill}`).join('\n')
  const message =
`Namaste 🙏 — this is Magic Bus India Foundation (Training Partner).

You signed an MoU with our HQ for ${mou.role} (${allocation.allocated} slots at this branch).

To confirm hiring for our Q3 batch please reply with:
  1. Number of trainees you can take this quarter
  2. Your name + role at the branch

Top skills this batch is being trained on:
${topSkills}

Reply YES to confirm all ${allocation.allocated} slots, or reply with the number you can take.

— Sunita Devi, Magic Bus Patna Centre · ${today}`

  return (
    <div className="mb-3 rounded-lg border-2 border-[#25D366]/50 bg-white p-3 space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-bold text-[#128C7E] inline-flex items-center gap-1">
        <MessageCircle className="w-3 h-3" /> WhatsApp ping preview
      </div>

      {/* WhatsApp-style bubble */}
      <div className="bg-[#DCF8C6] rounded-xl rounded-tl-sm border border-[#25D366]/20 px-3 py-2 max-w-md">
        <div className="text-[11px] text-txt-primary whitespace-pre-line leading-snug">{message}</div>
        <div className="text-[9px] text-txt-tertiary mt-1 text-right">
          to {allocation.branchContactName || 'branch contact'} · {allocation.branchContactPhone || 'no phone yet'} · ✓ via SwiftChat
        </div>
      </div>

      {!allocation.branchContactPhone && (
        <div className="text-[10px] text-amber-700 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> No branch phone on file — message will not deliver. Update the allocation first.
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onSend}
          disabled={!allocation.branchContactPhone}
          className="text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-[#25D366] text-white font-bold hover:opacity-90 disabled:opacity-40">
          <Send className="w-3 h-3" /> Send via SwiftChat
        </button>
        <button onClick={onCancel} className="text-[11px] text-txt-secondary">Cancel</button>
      </div>
    </div>
  )
}

// ── WhatsApp ping status (after sending) ─────────────────────────────────
function WhatsAppPingStatus({ ping }) {
  const sentTime = ping.sentAt ? new Date(ping.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''
  const responseTime = ping.respondedAt ? new Date(ping.respondedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''

  if (ping.status === 'awaiting') {
    return (
      <div className="mb-3 rounded-lg border border-[#25D366]/40 bg-[#DCF8C6]/30 p-2.5 flex items-center gap-2 text-[11px]">
        <MessageCircle className="w-3.5 h-3.5 text-[#128C7E]" />
        <span className="text-txt-primary">Pinged on WhatsApp · awaiting reply</span>
        <span className="text-txt-tertiary ml-auto">{sentTime}</span>
      </div>
    )
  }
  if (ping.status === 'responded' && ping.accepted) {
    return (
      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 flex items-center gap-2 text-[11px]">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
        <span className="text-emerald-900">
          <b>{ping.branchContactName}</b> confirmed <b>{ping.confirmedSlots} slots</b> via WhatsApp
        </span>
        <span className="text-emerald-700/70 ml-auto">{responseTime}</span>
      </div>
    )
  }
  if (ping.status === 'responded' && !ping.accepted) {
    return (
      <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 flex items-center gap-2 text-[11px]">
        <X className="w-3.5 h-3.5 text-rose-700" />
        <span className="text-rose-900">Branch declined the slots — flag for HQ</span>
        <span className="text-rose-700/70 ml-auto">{responseTime}</span>
      </div>
    )
  }
  return null
}

const ALLOC_BADGE = {
  confirmed: { icon: CheckCircle2, label: 'Confirmed', pill: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending:   { icon: Clock,        label: 'Action needed', pill: 'bg-amber-100 text-amber-800 border-amber-200' },
  declined:  { icon: X,            label: 'Declined',  pill: 'bg-rose-100 text-rose-800 border-rose-200' },
  expired:   { icon: X,            label: 'Expired',   pill: 'bg-rose-100 text-rose-800 border-rose-200' },
}

const TINY_TONES = {
  primary: 'text-primary-dark',
  emerald: 'text-emerald-700',
  amber:   'text-amber-700',
  sky:     'text-sky-700',
}
function KpiTiny({ label, value, tone = 'primary' }) {
  return (
    <div className="text-center bg-surface-page/40 rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[13px] font-bold leading-tight ${TINY_TONES[tone] || TINY_TONES.primary}`}>{value}</div>
    </div>
  )
}
function LabelInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary mb-0.5">{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-bdr bg-white px-2 py-1 text-[12px] outline-none focus:border-primary" />
    </label>
  )
}

