// Retention dashboard — Day 30 / 60 / 90 milestone tracking with the same
// confidence-score lens we use on placements.
//
// Retention workflow (for NSDC officer context):
//   1. TP creates a check-in record at placement time (3 records: D30/D60/D90)
//   2. On milestone day, the platform NUDGES the trainee asking "still employed?"
//   3. Trainee responds yes/no → confidence rises
//   4. Optional: salary slip uploaded for the month → confidence rises further
//   5. Optional: employer confirms still employed → confidence at 95%+ (audit-grade)
//
// Visible to NSDC Officer + Funder + SSC. Hidden from learner / TP.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import SchemeFilterBar, { schemeLabel } from '../../components/SchemeFilterBar.jsx'
import { SCHEME_RETENTION } from './_schemeData.js'
import { computeConfidence, toneFor, labelFor } from '../../utils/confidenceScore.js'
import {
  Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Bell, Users, TrendingDown, ArrowRight, Sparkles,
} from 'lucide-react'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'

const RETENTION_QUICK_ASKS = [
  'Why is D90 retention lower than D30? Drop-off analysis',
  'Which scheme has the best D90 retention and why?',
  'Compare retention across PMKVY / DDU-GKY / SIB',
  'Audit candidates: trainees who left job between D30 and D90',
  'No-response cohort at D90 — re-engagement broadcast plan',
  'Average retention confidence — which scheme drives the dip?',
  'TPs with the lowest D90 confidence — flag for SSC follow-up',
  'How do I improve self-declared retention into 3-signal verified?',
]

// Confidence model adapted to retention check-ins:
//   TP scheduled check-in              = 0.30  (self-declared milestone exists)
//   Trainee responded (still working)  = +0.30
//   Salary slip uploaded that month    = +0.10
//   Employer confirmed                 = +0.10
//   EPFO / bank statement verified     = +0.15
function retentionConfidence({ tpScheduled, traineeResponded, slipUploaded, employerConfirmed, externallyVerified }) {
  return computeConfidence({
    tpDeclared:         !!tpScheduled,
    learnerConfirmed:   !!traineeResponded,
    docUploaded:        !!slipUploaded,
    employerConfirmed:  !!employerConfirmed,
    externallyVerified: !!externallyVerified,
  })
}

// Build illustrative check-in records from the scheme fixture so the funder
// demo has rows to inspect. Real wiring later maps from /api/retention/...
function generateCheckins(schemeData) {
  if (!schemeData) return []
  const rows = []
  let id = 1
  for (const [milestoneKey, label] of [['day30','Day 30'], ['day60','Day 60'], ['day90','Day 90']]) {
    const m = schemeData[milestoneKey]
    if (!m) continue
    const completed = m.completed
    const retained  = m.retained
    const lost      = completed - retained
    // Sample a few representative rows per milestone.
    rows.push({
      id: id++, milestone: label, traineeName: 'Aarav Kumar', state: 'Maharashtra',
      tpScheduled: true, traineeResponded: true, slipUploaded: true, employerConfirmed: true, externallyVerified: true,
      status: 'retained',
    })
    rows.push({
      id: id++, milestone: label, traineeName: 'Priya Sharma', state: 'Uttar Pradesh',
      tpScheduled: true, traineeResponded: true, slipUploaded: true, employerConfirmed: false, externallyVerified: false,
      status: 'retained',
    })
    rows.push({
      id: id++, milestone: label, traineeName: 'Rohit Singh', state: 'Bihar',
      tpScheduled: true, traineeResponded: true, slipUploaded: false, employerConfirmed: false, externallyVerified: false,
      status: 'retained',
    })
    rows.push({
      id: id++, milestone: label, traineeName: 'Suresh Yadav', state: 'Karnataka',
      tpScheduled: true, traineeResponded: false, slipUploaded: false, employerConfirmed: false, externallyVerified: false,
      status: 'no_response',
    })
    if (lost > 0) {
      rows.push({
        id: id++, milestone: label, traineeName: 'Anjali Verma', state: 'West Bengal',
        tpScheduled: true, traineeResponded: true, slipUploaded: false, employerConfirmed: false, externallyVerified: false,
        status: 'left_job',
      })
    }
  }
  return rows
}

export default function RetentionDashboardCanvas({ context }) {
  const [scheme, setScheme] = useState('all')
  const [milestones, setMilestones] = useState([])
  const [pending, setPending] = useState(null)
  const { role } = useApp() || {}
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  useEffect(() => {
    api.retentionCohorts().then(r => setMilestones(r.milestones || [])).catch(() => {})
  }, [])

  const adminLike = role === 'nsdc_officer' || role === 'funder' || role === 'ssc'
  const schemeData = SCHEME_RETENTION[scheme] || SCHEME_RETENTION.all

  // KPI roll-up from the scheme data.
  const placed   = schemeData.placed
  const d30      = schemeData.day30
  const d60      = schemeData.day60
  const d90      = schemeData.day90
  const r30      = Math.round((d30.retained / Math.max(placed, 1)) * 100)
  const r60      = Math.round((d60.retained / Math.max(placed, 1)) * 100)
  const r90      = Math.round((d90.retained / Math.max(placed, 1)) * 100)
  const respRate90 = Math.round((d90.completed / Math.max(placed, 1)) * 100)

  const checkins = useMemo(() => generateCheckins(schemeData), [scheme])
  const avgConfidence = useMemo(() => {
    if (checkins.length === 0) return 0
    const sum = checkins.reduce((s, c) => s + retentionConfidence(c), 0)
    return Math.round((sum / checkins.length) * 100) / 100
  }, [checkins])

  const dashboard = (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Scheme scope */}
      <div className="rounded-2xl border border-bdr-light bg-white p-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Scope · retention by scheme</div>
        <SchemeFilterBar value={scheme} onChange={setScheme} />
        <div className="text-[11px] text-txt-secondary mt-2">
          Showing: <span className="font-bold text-txt-primary">{schemeLabel(scheme)}</span> · placed cohort: <b>{placed.toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Users}        label="Placed cohort" value={placed.toLocaleString('en-IN')} tone="primary" />
        <Kpi icon={CheckCircle2} label="Day-30 retention" value={`${r30}%`} sub={`${d30.retained.toLocaleString('en-IN')} retained`} tone="emerald" />
        <Kpi icon={CheckCircle2} label="Day-60 retention" value={`${r60}%`} sub={`${d60.retained.toLocaleString('en-IN')} retained`} tone="sky" />
        <Kpi icon={TrendingDown} label="Day-90 retention" value={`${r90}%`} sub={`${d90.retained.toLocaleString('en-IN')} retained`} tone="amber" />
      </div>

      {/* Avg confidence + response-rate strip — admin only */}
      {adminLike && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Average retention confidence
            </div>
            <div className="text-[22px] font-bold text-emerald-900 leading-tight mt-1">{Math.round(avgConfidence * 100)}%</div>
            <div className="text-[11px] text-emerald-800/80">{labelFor(avgConfidence)} · across all sampled check-ins</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-sky-700 inline-flex items-center gap-1">
              <Bell className="w-3 h-3" /> Response rate at Day 90
            </div>
            <div className="text-[22px] font-bold text-sky-900 leading-tight mt-1">{respRate90}%</div>
            <div className="text-[11px] text-sky-800/80">{(placed - d90.completed).toLocaleString('en-IN')} unresponsive · needs follow-up nudge</div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-rose-700 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Day-90 drop-off
            </div>
            <div className="text-[22px] font-bold text-rose-900 leading-tight mt-1">{(d30.retained - d90.retained).toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-rose-800/80">Lost between Day-30 and Day-90 · audit / re-employment plan</div>
          </div>
        </div>
      )}

      {/* Per-milestone breakdown */}
      <div>
        <h3 className="text-[13px] font-bold text-txt-primary mb-2 inline-flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Retention by milestone · {schemeLabel(scheme)}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MilestoneCard label="Day 30" data={d30} placed={placed} tone="emerald" />
          <MilestoneCard label="Day 60" data={d60} placed={placed} tone="sky" />
          <MilestoneCard label="Day 90" data={d90} placed={placed} tone="amber" />
        </div>
      </div>

      {/* Workflow explainer */}
      <div className="rounded-2xl border border-bdr-light bg-surface-page/40 p-4">
        <div className="text-[11px] uppercase tracking-wider font-bold text-primary mb-2 inline-flex items-center gap-1.5">
          <Bell className="w-3 h-3" /> Retention workflow · how the confidence score builds
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-[12px]">
          <Step n="1" label="TP schedules check-ins at placement time" delta="+30%" />
          <Step n="2" label="Platform nudges trainee on milestone day" delta="" />
          <Step n="3" label="Trainee responds 'still working'" delta="+30%" />
          <Step n="4" label="Trainee uploads month's payslip" delta="+10%" />
          <Step n="5" label="EPFO / bank statement auto-verifies" delta="+15%" />
        </div>
      </div>

      {/* Check-in table with confidence per row */}
      {adminLike && (
        <div>
          <h3 className="text-[13px] font-bold text-txt-primary mb-2">Recent check-ins · confidence per record</h3>
          <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
                <tr>
                  <th className="text-left px-3 py-2">Milestone</th>
                  <th className="text-left px-3 py-2">Trainee</th>
                  <th className="text-left px-3 py-2">State</th>
                  <th className="text-center px-3 py-2">Signals</th>
                  <th className="text-right px-3 py-2">Confidence</th>
                  <th className="text-right px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {checkins.slice(0, 16).map(c => {
                  const score = retentionConfidence(c)
                  const tone = toneFor(score)
                  return (
                    <tr key={c.id} className="border-t border-bdr-light hover:bg-surface-page/40">
                      <td className="px-3 py-2 font-bold text-txt-primary">{c.milestone}</td>
                      <td className="px-3 py-2">{c.traineeName}</td>
                      <td className="px-3 py-2 text-txt-secondary">{c.state}</td>
                      <td className="px-3 py-2 text-center">
                        <SignalDots c={c} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-bold ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
                          {Math.round(score * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <StatusPill status={c.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-txt-tertiary leading-relaxed">
        <ShieldCheck className="w-3 h-3 inline -mt-0.5" /> Retention confidence uses the same 5-signal ladder as
        placement confidence. Anything below 60% = self-declared only, needs follow-up. 85%+ = externally
        verified (EPFO / bank). Visible to NSDC Officer / Funder / SSC roles only.
      </p>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · Retention"
      useWebSearch={true}
      extraSystem={
        "You are inside the RETENTION dashboard of the NSDC officer's KSK console.\n" +
        `Active scheme scope: ${schemeLabel(scheme)}.\n` +
        "Default to milestone-level (Day 30 / 60 / 90) questions, retention rates per scheme, response-rate gaps, " +
        "and the 5-signal confidence ladder (TP scheduled → trainee responds → payslip → employer → EPFO). " +
        "Emit ONE chart card per answer (line / bar / donut / data_table) + an action_panel when a problem surfaces. " +
        "If user asks about pre-retention dimensions (enrollment, placement filings), suggest opening Enrollments / Placement."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={RETENTION_QUICK_ASKS}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}

// ── Sub-components ──

const KPI_TONES = {
  primary: { bg: 'bg-primary-light/40', fg: 'text-primary-dark', icon: 'text-primary' },
  emerald: { bg: 'bg-emerald-50',       fg: 'text-emerald-700',  icon: 'text-emerald-600' },
  sky:     { bg: 'bg-sky-50',           fg: 'text-sky-700',      icon: 'text-sky-600' },
  amber:   { bg: 'bg-amber-50',         fg: 'text-amber-700',    icon: 'text-amber-600' },
}
function Kpi({ icon: Icon, label, value, sub, tone = 'primary' }) {
  const t = KPI_TONES[tone] || KPI_TONES.primary
  return (
    <div className={`rounded-2xl border border-bdr-light ${t.bg} p-3`}>
      <div className={`text-[10px] uppercase tracking-wider font-bold ${t.fg} inline-flex items-center gap-1`}>
        <Icon className={`w-3 h-3 ${t.icon}`} />{label}
      </div>
      <div className={`text-[22px] font-bold leading-tight mt-1 ${t.fg}`}>{value}</div>
      {sub && <div className="text-[11px] text-txt-secondary mt-0.5">{sub}</div>}
    </div>
  )
}

function MilestoneCard({ label, data, placed, tone = 'emerald' }) {
  const rate = Math.round((data.retained / Math.max(placed, 1)) * 100)
  const respRate = Math.round((data.completed / Math.max(placed, 1)) * 100)
  return (
    <div className="rounded-2xl border border-bdr-light bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-txt-primary">{label}</div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-pill bg-${tone}-100 text-${tone}-700`}>{rate}% retained</span>
      </div>
      <div className="mt-2 h-2 rounded-pill bg-slate-100 overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${(data.retained / Math.max(placed, 1)) * 100}%` }} />
        <div className="h-full bg-amber-400"  style={{ width: `${((data.completed - data.retained) / Math.max(placed, 1)) * 100}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-txt-secondary">
        <div>
          <div className="text-[12px] font-bold text-emerald-700">{data.retained.toLocaleString('en-IN')}</div>
          <div className="uppercase tracking-wider">Retained</div>
        </div>
        <div>
          <div className="text-[12px] font-bold text-amber-700">{(data.completed - data.retained).toLocaleString('en-IN')}</div>
          <div className="uppercase tracking-wider">Left job</div>
        </div>
        <div>
          <div className="text-[12px] font-bold text-slate-500">{(placed - data.completed).toLocaleString('en-IN')}</div>
          <div className="uppercase tracking-wider">No response</div>
        </div>
      </div>
      <div className="text-[10px] text-txt-tertiary mt-2">Response rate: <b className="text-txt-primary">{respRate}%</b></div>
    </div>
  )
}

function Step({ n, label, delta }) {
  return (
    <div className="rounded-xl border border-bdr-light bg-white p-2.5 relative">
      <div className="text-[10px] uppercase tracking-wider font-bold text-primary inline-flex items-center gap-1">
        <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">{n}</span>
        {delta && <span className="text-emerald-700 ml-1">{delta}</span>}
      </div>
      <div className="text-[11px] text-txt-primary mt-1 leading-snug">{label}</div>
    </div>
  )
}

function SignalDots({ c }) {
  const signals = [
    { on: c.tpScheduled,        title: 'TP scheduled' },
    { on: c.traineeResponded,   title: 'Trainee responded' },
    { on: c.slipUploaded,       title: 'Slip uploaded' },
    { on: c.employerConfirmed,  title: 'Employer confirmed' },
    { on: c.externallyVerified, title: 'EPFO / bank verified' },
  ]
  return (
    <div className="inline-flex items-center gap-0.5">
      {signals.map((s, i) => (
        <span key={i} title={s.title}
          className={`w-2 h-2 rounded-full ${s.on ? 'bg-emerald-500' : 'bg-slate-200'}`} />
      ))}
    </div>
  )
}

const STATUS_TONES = {
  retained:    { bg: 'bg-emerald-50', fg: 'text-emerald-700', label: 'Retained' },
  left_job:    { bg: 'bg-rose-50',    fg: 'text-rose-700',    label: 'Left job' },
  no_response: { bg: 'bg-slate-100',  fg: 'text-slate-600',   label: 'No response' },
}
function StatusPill({ status }) {
  const t = STATUS_TONES[status] || STATUS_TONES.no_response
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold ${t.bg} ${t.fg}`}>{t.label}</span>
}
