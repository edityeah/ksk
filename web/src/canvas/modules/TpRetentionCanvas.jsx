// TP Retention — Magic Bus India Foundation retention dashboard scoped
// to THIS TP. Shows the D30/D60/D90 cohort retention picture across centres.
//
// Sections:
//   • Hero with TP brand
//   • KPI grid (placed / D30 / D60 / D90 / D90 rate)
//   • Filter chips (centre / scheme)
//   • Bar chart — D90 retention by centre
//   • Donut — D30 vs D60 vs D90 cohort sizes (waterfall idea)
//   • Data table — centre-level retention with churn rate
//   • Saathi chat
//
// The TP sees retention rates and churn — not the NSDC confidence ladder.

import { useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES, SCHEME_ROLLUP } from './_tp/data.js'
import { RotateCcw, MapPin, Building2, Filter, Sparkles, AlertTriangle } from 'lucide-react'

const QUICK_ASKS = [
  'Why is Guwahati\'s D90 retention so low?',
  'Compare D90 retention by scheme',
  'Where am I leaking between D30 and D60?',
  'Which centres are above the 80% retention bar?',
  'Plan a retention call-out for at-risk learners',
  'Project Q4 D90 retention at current trend',
  'Which employer segments retain the worst?',
  'Recommend a retention coaching package',
]

// Synthesise D30 / D60 / D90 cohort sizes from each centre.
function cohorts(c) {
  // Anchor on c.retention90 then back-fill: D30 a bit higher, D60 between.
  const d90 = c.retention90
  const d60 = Math.min(95, Math.round(d90 + (d90 < 70 ? 10 : 6)))
  const d30 = Math.min(98, Math.round(d60 + (d90 < 70 ? 8 : 4)))
  const placed = c.placed
  return {
    placed,
    d30: Math.round(placed * d30 / 100),
    d60: Math.round(placed * d60 / 100),
    d90: Math.round(placed * d90 / 100),
    r30: d30, r60: d60, r90: d90,
  }
}

export default function TpRetentionCanvas({ context }) {
  const [pending, setPending] = useState(null)
  const [centreFilter, setCentreFilter] = useState('all')
  const [schemeFilter, setSchemeFilter] = useState('all')
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  const filteredCentres = useMemo(() => {
    return CENTRES.filter(c =>
      (centreFilter === 'all' || c.id === centreFilter) &&
      (schemeFilter === 'all' || c.schemes.includes(schemeFilter))
    )
  }, [centreFilter, schemeFilter])

  const totals = useMemo(() => {
    let placed = 0, d30 = 0, d60 = 0, d90 = 0
    for (const c of filteredCentres) {
      const k = cohorts(c)
      placed += k.placed; d30 += k.d30; d60 += k.d60; d90 += k.d90
    }
    return { placed, d30, d60, d90 }
  }, [filteredCentres])

  const r90 = totals.placed ? Math.round(totals.d90 / totals.placed * 100) : 0
  const r60 = totals.placed ? Math.round(totals.d60 / totals.placed * 100) : 0
  const r30 = totals.placed ? Math.round(totals.d30 / totals.placed * 100) : 0

  const kpiCard = {
    title: 'Retention waterfall · filtered scope',
    items: [
      { label: 'Placed (cohort)',  value: totals.placed.toLocaleString('en-IN'), tone: 'primary' },
      { label: 'Still at D30',     value: totals.d30.toLocaleString('en-IN'),    delta: `${r30}%`, tone: 'emerald' },
      { label: 'Still at D60',     value: totals.d60.toLocaleString('en-IN'),    delta: `${r60}%`, tone: 'sky' },
      { label: 'Still at D90',     value: totals.d90.toLocaleString('en-IN'),    delta: `${r90}%`, tone: r90 >= 80 ? 'emerald' : r90 >= 70 ? 'sky' : 'amber' },
      { label: 'Churn by D90',     value: (totals.placed - totals.d90).toLocaleString('en-IN'), delta: `${100 - r90}% lost`, tone: 'rose' },
      { label: 'Centres in scope', value: filteredCentres.length.toString(),     tone: 'indigo' },
    ],
  }

  const byCentreBar = {
    title: 'D90 retention rate by centre',
    annotation: 'Bars under 70% are audit-risk — these placements are unlikely to count toward verified outcomes.',
    unit: '%',
    color: 'emerald',
    data: filteredCentres
      .slice()
      .sort((a, b) => b.retention90 - a.retention90)
      .map(c => ({
        label: c.city,
        value: c.retention90,
        color: c.retention90 >= 80 ? 'emerald' : c.retention90 >= 70 ? 'sky' : 'amber',
      })),
  }

  const waterfallDonut = {
    title: 'D30 vs D60 vs D90 still-employed cohort',
    unit: 'learners',
    annotation: 'Where the cohort drops off most steeply. A big D30→D60 dip usually means onboarding mismatch; D60→D90 usually means salary/role drift.',
    data: [
      { label: 'D30 retained', value: totals.d30, color: 'emerald' },
      { label: 'D60 retained', value: totals.d60, color: 'sky' },
      { label: 'D90 retained', value: totals.d90, color: 'violet' },
    ].filter(d => d.value > 0),
  }

  const bySchemeBar = {
    title: 'Avg D90 retention by scheme',
    annotation: 'Higher is better. Schemes with placement-linked stipend tend to retain better.',
    unit: '%',
    color: 'violet',
    orient: 'horizontal',
    data: SCHEME_ROLLUP.map(s => ({ label: s.name, value: s.retention90 })).sort((a, b) => b.value - a.value),
  }

  const centreTable = {
    title: 'Centre-level retention',
    columns: [
      { key: 'name',    label: 'Centre' },
      { key: 'placed',  label: 'Placed',     type: 'number' },
      { key: 'd30',     label: 'D30',        type: 'number' },
      { key: 'd60',     label: 'D60',        type: 'number' },
      { key: 'd90',     label: 'D90',        type: 'number' },
      { key: 'r90',     label: 'D90 %',      type: 'percent' },
      { key: 'churn',   label: 'Churn %',    type: 'percent' },
    ],
    rows: filteredCentres.map(c => {
      const k = cohorts(c)
      return { name: c.name, placed: k.placed, d30: k.d30, d60: k.d60, d90: k.d90, r90: k.r90, churn: 100 - k.r90 }
    }),
    highlight: filteredCentres.some(c => c.retention90 < 70)
      ? 'One or more centres are below 70% D90 — schedule employer call-outs this week.'
      : null,
  }

  const lowCentres = filteredCentres.filter(c => c.retention90 < 70)

  const dashboard = (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-cyan-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-cyan-700 inline-flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Training Partner · Retention
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres</span>
          <span className="font-bold text-cyan-700">Avg D90 retention {TP_ROLLUP.avgRetention}%</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-bdr-light bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2 inline-flex items-center gap-1">
            <Filter className="w-3 h-3" /> Scope
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterPicker label="Centre" value={centreFilter} onChange={setCentreFilter}
              options={[{ id: 'all', name: 'All centres' }, ...CENTRES.map(c => ({ id: c.id, name: c.name }))]} />
            <FilterPicker label="Scheme" value={schemeFilter} onChange={setSchemeFilter}
              options={[{ id: 'all', name: 'All schemes' }, ...TP_PROFILE.primarySchemes.map(s => ({ id: s, name: s }))]} />
            {(centreFilter !== 'all' || schemeFilter !== 'all') && (
              <button onClick={() => { setCentreFilter('all'); setSchemeFilter('all') }}
                className="text-[11px] text-primary self-end">Reset filters</button>
            )}
          </div>
        </div>

        <KpiGridCard card={kpiCard} />

        {lowCentres.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-amber-800">
                {lowCentres.length} centre{lowCentres.length === 1 ? '' : 's'} below 70% D90 retention
              </div>
              <div className="text-[11px] text-amber-800/80">{lowCentres.map(c => c.name).join(' · ')}</div>
            </div>
            <button onClick={() => askSaathi(`For these low-retention centres: ${lowCentres.map(c => c.name).join(', ')}. Diagnose likely root causes and recommend a 4-week retention coaching plan. Emit an action_panel.`)}
              className="px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-700 flex-shrink-0">
              <Sparkles className="w-3 h-3" /> Coaching plan
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard card={byCentreBar} />
          <DonutChartCard card={waterfallDonut} />
        </div>

        <BarChartCard card={bySchemeBar} />

        <DataTableCard card={centreTable} />
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Retention"
      useWebSearch={false}
      extraSystem={
        `You are inside the RETENTION dashboard of Training Partner: ${TP_PROFILE.name}. ` +
        `Scope: ${TP_ROLLUP.centres} centres, avg D90 retention ${TP_ROLLUP.avgRetention}%. ` +
        `Current filter: centre=${centreFilter}, scheme=${schemeFilter}. ` +
        "TP-side view — focus on retention rate, churn, and coaching actions. Do NOT show NSDC confidence ladder here. " +
        "Emit ONE chart card per analytic answer + action_panel when intervention is needed."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={QUICK_ASKS}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}

function FilterPicker({ label, value, onChange, options }) {
  return (
    <label className="text-[11px] text-txt-secondary inline-flex items-center gap-2">
      <span className="uppercase tracking-wider font-bold text-txt-tertiary">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="rounded-pill border border-bdr bg-white px-2 py-1 text-[11px] text-txt-primary outline-none focus:border-primary max-w-[200px]">
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
