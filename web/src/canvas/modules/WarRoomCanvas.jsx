// War Room — the NSDC officer's live anomaly feed.
// NOT a dashboard view. This is the actionable surface: each card is an
// anomaly (flagged TP, ghost placements, batch stalls, data-quality issue,
// scheme drift) with its own severity, body, and action chips.
//
// Saathi at the bottom can investigate any alert. Alerts can be:
//   resolved · snoozed · escalated · or fed into an action_panel for batch
//   broadcasts / audits / nudges / tickets.

import { useMemo, useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import { useApp } from '../../context/AppContext.jsx'
import {
  AlertTriangle, Siren, ShieldAlert, FileWarning, Building2, MapPin,
  TrendingDown, Calendar, Sparkles, CheckCircle2, BellOff, ArrowUpRight, Megaphone,
} from 'lucide-react'

// ── Anomaly fixtures, derived from the NSDC Academy dashboard data ────
const ALERTS = [
  {
    id: 'a1',
    severity: 'critical',
    icon: Siren,
    category: 'Ghost placement risk',
    title: 'IIB Education: 15,305 certified → 119 placed (0.8%)',
    body: 'Cert-to-place ratio is 30× below the national median of 23.6%. Either data is missing, employer letters are forged, or the placement pipeline collapsed. Demands immediate audit.',
    facets: [
      { icon: Building2, label: 'IIB Education Private Limited' },
      { icon: TrendingDown, label: '0.8% conversion' },
      { icon: Calendar, label: 'Stuck for 3 quarters' },
    ],
    actions: ['Audit IIB Education placement filings', 'Pull employer-letter sample', 'Hold next disbursal'],
    askPrompt: 'Walk me through the IIB Education anomaly. Show the data-quality flags, propose an audit playbook, and emit an action_panel.',
  },
  {
    id: 'a2',
    severity: 'critical',
    icon: ShieldAlert,
    category: 'Single-TP concentration',
    title: 'Scholiverse Educare runs 48% of national batches',
    body: 'One TP accounts for 2,87,318 of 5,89,762 batches. If Scholiverse falters, half the national throughput stalls. No second-source for many of these batches.',
    facets: [
      { icon: Building2, label: 'Scholiverse Educare Private Limited' },
      { icon: TrendingDown, label: '48.7% of national batches' },
    ],
    actions: ['Audit Scholiverse batch reality', 'Onboard 3-5 alternates', 'Brief CEO + Ministry'],
    askPrompt: 'Diagnose the Scholiverse single-TP concentration risk. Recommend a diversification plan and emit an action_panel.',
  },
  {
    id: 'a3',
    severity: 'high',
    icon: FileWarning,
    category: 'Data-quality flag',
    title: 'Self-Certified candidates = 81% of all assessments',
    body: '22,31,357 of 26,26,019 assessments are self-certified. SSC-Certified only 1,06,946 (3.9%). Outcomes funders cannot count self-certifications — credentialing pipeline must be widened.',
    facets: [
      { icon: TrendingDown, label: 'Self-Cert 81%, SSC 3.9%' },
      { icon: Calendar, label: 'Persistent for 4 quarters' },
    ],
    actions: ['Broadcast to all TPs requiring third-party tests', 'Open NOS gap-analysis with SSCs', 'Tighten scheme rules for cert evidence'],
    askPrompt: 'Analyse the Self-Certified credentialing gap. Recommend a TP-side fix and a Ministry brief.',
  },
  {
    id: 'a4',
    severity: 'high',
    icon: AlertTriangle,
    category: 'TP under-performer',
    title: 'VLCC Limited: 38,178 certified → 1,623 placed (4.3%)',
    body: 'VLCC has a strong training pipeline but placement collapsed. Beauty & Wellness sector-wide conversion is 18.3% — VLCC is 4× worse. Either employer relationships dried up or placement reporting is missing.',
    facets: [
      { icon: Building2, label: 'VLCC Limited' },
      { icon: TrendingDown, label: '4.3% conversion vs 18.3% sector avg' },
    ],
    actions: ['Audit VLCC placement filing', 'Sector SSC follow-up', 'Nudge VLCC nodal officer'],
    askPrompt: 'Walk me through the VLCC placement gap. Emit a bar chart comparing VLCC vs Beauty & Wellness sector average + an action_panel.',
  },
  {
    id: 'a5',
    severity: 'high',
    icon: MapPin,
    category: 'State concentration',
    title: 'Haryana = 53% of national batches',
    body: '3,13,541 of 5,89,762 batches run in Haryana — clustering driven by online-delivery TPs registered there. National batch capacity will appear to drop sharply if Haryana shifts even slightly.',
    facets: [
      { icon: MapPin, label: 'Haryana' },
      { icon: TrendingDown, label: '53.2% of batches' },
    ],
    actions: ['Re-validate Haryana batches are physical, not paper', 'Diversify TP base across UP / Bihar / TN', 'Brief Ministry'],
    askPrompt: 'Analyse the Haryana batch concentration anomaly. Show a state-wise bar chart and propose a diversification action_panel.',
  },
  {
    id: 'a6',
    severity: 'medium',
    icon: TrendingDown,
    category: 'Sector pipeline leak',
    title: 'Domestic Workers: 59,548 assessed → 2,768 certified (4.6%)',
    body: 'Certification rate is 20× below average. NOS coverage gap or certification body capacity gap. Either way, candidates being trained but not credentialed counts as a write-off for outcomes funders.',
    facets: [
      { icon: TrendingDown, label: '4.6% certification rate' },
      { icon: Sparkles, label: 'Sector: Domestic Workers' },
    ],
    actions: ['Open SSC follow-up: Domestic Workers Sector Council', 'Audit certification body throughput', 'Schedule NOS review'],
    askPrompt: 'Analyse the Domestic Workers certification leak. Propose a Ministry-grade root-cause and an action_panel.',
  },
  {
    id: 'a7',
    severity: 'medium',
    icon: AlertTriangle,
    category: 'Category data quality',
    title: 'Social Category "Not Disclosed" = 47% of enrolments',
    body: '12,92,254 of 27,74,408 candidates have no social category recorded. SC / ST reservation rollups, BBBP cohort tracking, all rely on this field. TPs need an explicit nudge + form validation.',
    facets: [
      { icon: TrendingDown, label: '47% missing data' },
    ],
    actions: ['Broadcast TP-side data-quality requirement', 'Enable form-level validation', 'Block disbursal pending category'],
    askPrompt: 'Analyse the category-field data-quality issue. Emit a donut showing the breakdown + an action_panel.',
  },
  {
    id: 'a8',
    severity: 'low',
    icon: Calendar,
    category: 'Pipeline thin',
    title: 'Upcoming batches sparse: only 533 nationally',
    body: 'Ongoing batches at 72K, completed at 5.1L — but upcoming pipeline is just 533 batches. Throughput will hit a wall in 4-6 weeks if TPs do not declare new batches.',
    facets: [
      { icon: TrendingDown, label: 'Upcoming: 0.09% of total' },
    ],
    actions: ['Broadcast to all TPs requesting Q3 batch declarations', 'CEO update', 'Nudge top-25 TPs'],
    askPrompt: 'Analyse the thin upcoming-batch pipeline. Propose a national broadcast + Top-25-TP nudge.',
  },
]

const SEVERITY = {
  critical: { dot: 'bg-rose-600',  text: 'text-rose-700',  bg: 'bg-rose-50/80',   border: 'border-rose-200' },
  high:     { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50/80',  border: 'border-amber-200' },
  medium:   { dot: 'bg-sky-500',   text: 'text-sky-700',   bg: 'bg-sky-50/80',    border: 'border-sky-200' },
  low:      { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50/80',  border: 'border-slate-200' },
}

export default function WarRoomCanvas({ context }) {
  const { showToast } = useApp() || {}
  const [pending, setPending] = useState(null)
  const [state, setState] = useState(() => Object.fromEntries(ALERTS.map(a => [a.id, 'open']))) // open | snoozed | resolved | escalated

  const ask = (text) => setPending({ text, nonce: Date.now() })

  function setAlert(id, next) {
    setState(s => ({ ...s, [id]: next }))
    const verb =
      next === 'resolved'  ? 'Alert resolved' :
      next === 'snoozed'   ? 'Snoozed for 7 days' :
      next === 'escalated' ? 'Escalated to CEO' : 'Updated'
    showToast?.({ kind: next === 'resolved' ? 'success' : 'info', text: verb })
  }

  const visible = ALERTS.filter(a => state[a.id] !== 'resolved')
  const open       = visible.filter(a => state[a.id] === 'open')
  const escalated  = visible.filter(a => state[a.id] === 'escalated')
  const snoozed    = visible.filter(a => state[a.id] === 'snoozed')

  const extraSystem = useMemo(() => (
    "You are inside the War Room — the NSDC officer's live anomaly feed. Treat each conversation as an investigation: 1-2 sentence narrative + ONE chart card (bar/donut/table) drawn from the NSDC Academy data + an action_panel with broadcast/audit/nudge/ticket/escalate actions. Never ask clarifying questions before answering."
  ), [])

  const top = (
    <div className="h-full overflow-y-auto">
      {/* Hero band */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-rose-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-rose-700">War Room · Live anomalies</div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
          {open.length} open · {escalated.length} escalated · {snoozed.length} snoozed
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1">
          Auto-generated alerts from the NSDC Academy data mart. Tap any alert to investigate with Saathi, fire an action, or escalate.
        </div>
      </div>

      <div className="p-4 space-y-3">
        {open.map(a => <AlertCard key={a.id} alert={a} onAsk={ask} onMark={setAlert} status="open" />)}
        {escalated.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-wider font-bold text-rose-600 pt-2">Escalated</div>
            {escalated.map(a => <AlertCard key={a.id} alert={a} onAsk={ask} onMark={setAlert} status="escalated" />)}
          </>
        )}
        {snoozed.length > 0 && (
          <>
            <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary pt-2">Snoozed</div>
            {snoozed.map(a => <AlertCard key={a.id} alert={a} onAsk={ask} onMark={setAlert} status="snoozed" />)}
          </>
        )}
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <div className="text-[15px] font-bold text-txt-primary">All clear</div>
            <div className="text-[12px] text-txt-secondary mt-1">No open anomalies. Nice.</div>
          </div>
        )}
      </div>
    </div>
  )

  // Surface a compact prompt strip inside the chat panel itself — one short
  // chip per open alert so the officer always sees a tappable starting point.
  const warRoomQuickAsks = ALERTS
    .filter(a => state[a.id] !== 'resolved')
    .slice(0, 6)
    .map(a => `Investigate: ${a.title}`)

  const bottom = (
    <AvatarCall
      persona="general"
      title="Saathi · War Room"
      useWebSearch={true}
      extraSystem={extraSystem}
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={warRoomQuickAsks}
    />
  )

  return <ResizableSaathiSplit top={top} bottom={bottom} />
}

function AlertCard({ alert, onAsk, onMark, status }) {
  const sev = SEVERITY[alert.severity] || SEVERITY.medium
  const Icon = alert.icon || AlertTriangle
  return (
    <div className={`rounded-2xl border ${sev.border} ${sev.bg} shadow-card overflow-hidden`}>
      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-white border ${sev.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${sev.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
            <span className={`text-[10px] uppercase tracking-wider font-bold ${sev.text}`}>{alert.severity} · {alert.category}</span>
          </div>
          <div className="font-bold text-[14px] text-txt-primary leading-tight mt-1">{alert.title}</div>
          <div className="text-[12px] text-txt-secondary leading-snug mt-1">{alert.body}</div>
          {alert.facets?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alert.facets.map((f, i) => {
                const FacetIcon = f.icon || Sparkles
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-white border border-bdr-light text-[11px] text-txt-primary">
                    <FacetIcon className="w-3 h-3 text-txt-tertiary" />{f.label}
                  </span>
                )
              })}
            </div>
          )}
          {alert.actions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {alert.actions.map((act, i) => (
                <button key={i} onClick={() => onAsk(`${act} — for: ${alert.title}`)}
                  className="text-[11px] px-2.5 py-1 rounded-pill bg-white border border-bdr text-txt-primary hover:border-primary hover:text-primary inline-flex items-center gap-1 transition">
                  <Megaphone className="w-3 h-3" />{act}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Footer controls */}
      <div className="px-4 py-2 bg-white border-t border-bdr-light/60 flex items-center gap-2 text-[11px]">
        <button onClick={() => onAsk(alert.askPrompt)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-primary text-white font-bold hover:opacity-90">
          <Sparkles className="w-3 h-3" /> Investigate with Saathi
        </button>
        <div className="flex-1" />
        {status !== 'escalated' && (
          <button onClick={() => onMark(alert.id, 'escalated')} className="inline-flex items-center gap-1 px-2 py-1 rounded-pill text-rose-700 hover:bg-rose-50">
            <ArrowUpRight className="w-3 h-3" /> Escalate
          </button>
        )}
        {status !== 'snoozed' && (
          <button onClick={() => onMark(alert.id, 'snoozed')} className="inline-flex items-center gap-1 px-2 py-1 rounded-pill text-txt-secondary hover:bg-slate-100">
            <BellOff className="w-3 h-3" /> Snooze 7d
          </button>
        )}
        <button onClick={() => onMark(alert.id, 'resolved')} className="inline-flex items-center gap-1 px-2 py-1 rounded-pill text-emerald-700 hover:bg-emerald-50">
          <CheckCircle2 className="w-3 h-3" /> Resolve
        </button>
      </div>
    </div>
  )
}
