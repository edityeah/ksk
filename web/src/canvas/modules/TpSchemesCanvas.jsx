// TP Schemes — Magic Bus India Foundation scheme-portfolio dashboard.
// Shows which schemes the TP runs, the volume / outcomes per scheme, and the
// compliance status (KPIs the TP must meet per scheme).
//
// Sections:
//   • Hero with TP brand
//   • KPI grid (#schemes active, total enrolled by scheme, total placed by scheme)
//   • Scheme cards — one card per scheme with status pill + KPIs + centres list
//   • Bar chart — enrolment by scheme
//   • Bar chart — placement rate by scheme
//   • Data table — scheme compliance rollup
//   • Saathi chat

import { useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES, SCHEME_ROLLUP } from './_tp/data.js'
import { Coins, MapPin, Building2, ShieldCheck, AlertTriangle, Sparkles, FileText, CheckCircle2 } from 'lucide-react'

const QUICK_ASKS = [
  'Which scheme is most profitable for me right now?',
  'Where am I out of compliance?',
  'Should I apply for PM Vishwakarma in more centres?',
  'Compare PMKVY vs DDU-GKY outcomes',
  'Forecast scheme-wise placement next quarter',
  'Which scheme has the lowest filing burden?',
  'Recommend the best scheme mix for Guwahati',
  'Plan a compliance catch-up for the next audit',
]

// Hand-curated compliance status per scheme (illustrative).
const SCHEME_COMPLIANCE = {
  'PMKVY 4.0':       { status: 'green',  obligations: ['Aadhaar-seeded enrolment', 'NSQF-aligned QPs', '50% placement target'], notes: 'On track — last audit Q2 2024, clean.' },
  'DDU-GKY':         { status: 'amber',  obligations: ['Mobilization records', 'Hostel/migration support', '70% placement target'], notes: 'Hostel compliance docs missing for Ranchi.' },
  'NAPS':            { status: 'green',  obligations: ['Apprentice contract uploaded', 'DBT stipend reconciliation'], notes: 'All apprentice contracts on portal.' },
  'PM Vishwakarma':  { status: 'amber',  obligations: ['Trade certificate verified', 'Toolkit advance disbursed'], notes: 'Toolkit advance pending for 124 learners — escalate.' },
}

function scheme(name) {
  return SCHEME_ROLLUP.find(s => s.name === name) || { name, centres: 0, enrolled: 0, placed: 0, retention90: 0 }
}

export default function TpSchemesCanvas({ context }) {
  const [pending, setPending] = useState(null)
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  const schemes = TP_PROFILE.primarySchemes.map(name => ({
    ...scheme(name),
    centresList: CENTRES.filter(c => c.schemes.includes(name)).map(c => c.name),
    compliance: SCHEME_COMPLIANCE[name] || { status: 'green', obligations: [], notes: '' },
  }))

  const amberCount = schemes.filter(s => s.compliance.status !== 'green').length

  const kpiCard = {
    title: 'Scheme portfolio · summary',
    items: [
      { label: 'Schemes active',    value: schemes.length.toString(),                           tone: 'primary' },
      { label: 'Schemes compliant', value: schemes.filter(s => s.compliance.status === 'green').length.toString(), tone: 'emerald' },
      { label: 'Action needed',     value: amberCount.toString(), delta: amberCount ? 'compliance gaps' : 'all clear', tone: amberCount ? 'amber' : 'emerald' },
      { label: 'Total enrolled',    value: TP_ROLLUP.enrolled.toLocaleString('en-IN'),          tone: 'sky' },
      { label: 'Total placed',      value: TP_ROLLUP.placed.toLocaleString('en-IN'),            tone: 'rose' },
      { label: 'Avg D90 retention', value: `${TP_ROLLUP.avgRetention}%`,                        tone: 'indigo' },
    ],
  }

  const enrolBar = {
    title: 'Enrolment by scheme',
    unit: 'enrolled',
    color: 'primary',
    annotation: 'Each centre splits its enrolment proportionally across the schemes it operates.',
    data: schemes.map(s => ({ label: s.name, value: s.enrolled })).sort((a, b) => b.value - a.value),
  }

  const placeRateBar = {
    title: 'Placement rate by scheme',
    unit: '%',
    color: 'emerald',
    annotation: 'Placement rate ≈ placed / enrolled per scheme. Higher rate ⇒ scheme is healthier for outcome-linked payment.',
    data: schemes.map(s => ({
      label: s.name,
      value: s.enrolled ? Math.round(s.placed / s.enrolled * 100) : 0,
    })).sort((a, b) => b.value - a.value),
  }

  const complianceTable = {
    title: 'Scheme compliance rollup',
    columns: [
      { key: 'name',     label: 'Scheme' },
      { key: 'centres',  label: 'Centres', type: 'number' },
      { key: 'enrolled', label: 'Enrolled', type: 'number' },
      { key: 'placed',   label: 'Placed',   type: 'number' },
      { key: 'r90',      label: 'D90 %',    type: 'percent' },
      { key: 'status',   label: 'Status' },
      { key: 'notes',    label: 'Notes' },
    ],
    rows: schemes.map(s => ({
      name: s.name,
      centres: s.centres,
      enrolled: s.enrolled,
      placed: s.placed,
      r90: s.retention90,
      status: s.compliance.status === 'green' ? '✓ Compliant' : '⚠ Action needed',
      notes: s.compliance.notes,
    })),
    highlight: amberCount ? `${amberCount} scheme${amberCount === 1 ? '' : 's'} have open compliance items — close them before next audit.` : null,
  }

  const dashboard = (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-amber-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-amber-700 inline-flex items-center gap-1">
          <Coins className="w-3 h-3" /> Training Partner · Schemes
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres</span>
          <span className="font-bold text-amber-700">{schemes.length} schemes active</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <KpiGridCard card={kpiCard} />

        {/* Scheme cards */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-primary mb-2 inline-flex items-center gap-1">
            <FileText className="w-3 h-3" /> Schemes you operate
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schemes.map(s => (
              <SchemeCard key={s.name} scheme={s} onAsk={askSaathi} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard card={enrolBar} />
          <BarChartCard card={placeRateBar} />
        </div>

        <DataTableCard card={complianceTable} />

        <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-amber-50/40 to-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-txt-primary">Thinking about adding a new scheme?</div>
            <div className="text-[11px] text-txt-secondary">Saathi can match centres + tracks against eligibility for SIB, RPL, PMNAP and Skill Hub.</div>
          </div>
          <button onClick={() => askSaathi('Recommend the next scheme this TP should onboard onto. Match centres + tracks against eligibility for SIB, RPL, PMNAP, Skill Hub. Build an action_panel with concrete next steps.')}
            className="px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[12px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
            <Sparkles className="w-3 h-3" /> Scheme advisor
          </button>
        </div>
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Schemes"
      useWebSearch={false}
      extraSystem={
        `You are inside the SCHEMES dashboard of Training Partner: ${TP_PROFILE.name}. ` +
        `Active schemes: ${TP_PROFILE.primarySchemes.join(', ')}. ` +
        `${amberCount} scheme(s) have open compliance items. ` +
        "Help the TP think about scheme portfolio, compliance, and which schemes to add. Quote concrete numbers from the scheme rollup. " +
        "Emit ONE chart card per analytic question + an action_panel when there's a compliance gap or onboarding decision to make."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={QUICK_ASKS}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}

const STATUS_STYLE = {
  green: { pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2, label: 'Compliant' },
  amber: { pill: 'bg-amber-100  text-amber-800  border-amber-200',    icon: AlertTriangle, label: 'Action needed' },
  red:   { pill: 'bg-rose-100   text-rose-800   border-rose-200',     icon: AlertTriangle, label: 'At risk' },
}

function SchemeCard({ scheme: s, onAsk }) {
  const style = STATUS_STYLE[s.compliance.status] || STATUS_STYLE.green
  const Icon = style.icon
  const placeRate = s.enrolled ? Math.round(s.placed / s.enrolled * 100) : 0

  return (
    <div className="rounded-2xl border border-bdr-light bg-white shadow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-txt-primary">{s.name}</div>
          <div className="text-[11px] text-txt-secondary mt-0.5">{s.centresList.length} centres · {s.enrolled.toLocaleString('en-IN')} enrolled</div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill border ${style.pill} text-[10px] font-bold flex-shrink-0`}>
          <Icon className="w-3 h-3" /> {style.label}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <KpiSmall label="Placed"     value={s.placed.toLocaleString('en-IN')} />
        <KpiSmall label="Place rate" value={`${placeRate}%`} />
        <KpiSmall label="D90"        value={`${s.retention90}%`} tone={s.retention90 >= 80 ? 'emerald' : s.retention90 >= 70 ? 'sky' : 'amber'} />
      </div>

      {/* Centres */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1">Centres running this scheme</div>
        <div className="flex flex-wrap gap-1">
          {s.centresList.map(n => (
            <span key={n} className="text-[10px] px-2 py-0.5 rounded-pill bg-surface-page text-txt-primary border border-bdr-light">{n}</span>
          ))}
        </div>
      </div>

      {/* Obligations */}
      {s.compliance.obligations.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-1 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Key obligations
          </div>
          <ul className="text-[11px] text-txt-secondary list-disc pl-4 space-y-0.5">
            {s.compliance.obligations.map(o => <li key={o}>{o}</li>)}
          </ul>
        </div>
      )}

      {/* Notes */}
      {s.compliance.notes && (
        <div className={`mt-3 text-[11px] rounded-lg px-2 py-1.5 ${s.compliance.status === 'green' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {s.compliance.notes}
        </div>
      )}

      {/* Action */}
      <div className="mt-3 pt-3 border-t border-bdr-light flex items-center justify-end">
        <button onClick={() => onAsk(`Tell me everything I need to know about my ${s.name} portfolio — where I'm doing well, where the gaps are, and what to do this quarter.`)}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-primary text-white hover:opacity-90">
          <Sparkles className="w-3 h-3" /> Ask Saathi about {s.name}
        </button>
      </div>
    </div>
  )
}

const KPI_SMALL_TONES = {
  primary: 'text-primary-dark',
  emerald: 'text-emerald-700',
  sky:     'text-sky-700',
  amber:   'text-amber-700',
  rose:    'text-rose-700',
}
function KpiSmall({ label, value, tone = 'primary' }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-bold text-txt-tertiary">{label}</div>
      <div className={`text-[14px] font-bold leading-tight ${KPI_SMALL_TONES[tone] || KPI_SMALL_TONES.primary}`}>{value}</div>
    </div>
  )
}
