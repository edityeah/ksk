// TP Enrollment — Magic Bus India Foundation, enrolment dashboard scoped
// to THIS TP. Splits the enrolment story across centres, tracks, and schemes.
//
// Sections:
//   • Hero with TP brand + headline enrolment number
//   • KPI grid (enrolled / trained / certified / placed / conversion rates)
//   • Filter chips (centre / scheme)
//   • Bar chart — enrolment by centre
//   • Donut — share by scheme
//   • Bar chart — top tracks by enrolment
//   • Data table — centre-level enrolment with conversion rates
//   • Saathi chat at the bottom

import { useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES, TRACKS, SCHEME_ROLLUP } from './_tp/data.js'
import { Users, MapPin, Building2, Filter, Sparkles } from 'lucide-react'

const QUICK_ASKS = [
  'Which centre brings the most enrolments?',
  'Which tracks are over-subscribed?',
  'Compare PMKVY vs DDU-GKY enrolment in my centres',
  'Where am I leaking trainees between enrolled and trained?',
  'Project Q4 enrolment if current pace continues',
  'Which centres are below their batch capacity?',
  'Show me women enrolment share by centre',
  'Send a broadcast to under-target centres',
]

export default function TpEnrollmentCanvas({ context }) {
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

  const totals = useMemo(() => filteredCentres.reduce((acc, c) => ({
    enrolled:  acc.enrolled  + c.enrolled,
    trained:   acc.trained   + c.trained,
    certified: acc.certified + c.certified,
    placed:    acc.placed    + c.placed,
  }), { enrolled: 0, trained: 0, certified: 0, placed: 0 }), [filteredCentres])

  const kpiCard = {
    title: 'Enrolment funnel · filtered scope',
    items: [
      { label: 'Enrolled',          value: totals.enrolled.toLocaleString('en-IN'),  tone: 'primary' },
      { label: 'Trained',           value: totals.trained.toLocaleString('en-IN'),   delta: `${Math.round(totals.trained / Math.max(totals.enrolled, 1) * 100)}% of enrolled`, tone: 'sky' },
      { label: 'Certified',         value: totals.certified.toLocaleString('en-IN'), delta: `${Math.round(totals.certified / Math.max(totals.trained, 1) * 100)}% of trained`, tone: 'violet' },
      { label: 'Placed',            value: totals.placed.toLocaleString('en-IN'),    delta: `${Math.round(totals.placed / Math.max(totals.certified, 1) * 100)}% of certified`, tone: 'emerald' },
      { label: 'Centres in scope',  value: filteredCentres.length.toString(),        tone: 'indigo' },
      { label: 'Avg enrol / centre',value: filteredCentres.length ? Math.round(totals.enrolled / filteredCentres.length).toLocaleString('en-IN') : '—', tone: 'amber' },
    ],
  }

  const byCentreBar = {
    title: 'Enrolment by centre',
    annotation: filteredCentres.length === CENTRES.length
      ? `Bhopal leads with ${CENTRES[0].enrolled.toLocaleString('en-IN')} enrolments. Guwahati trails at ${CENTRES.find(c=>c.id==='tc-guwahati').enrolled.toLocaleString('en-IN')} — also the flagged centre.`
      : `${filteredCentres.length} centres in scope.`,
    unit: 'enrolled',
    color: 'primary',
    data: filteredCentres
      .slice()
      .sort((a, b) => b.enrolled - a.enrolled)
      .map(c => ({ label: c.city, value: c.enrolled, color: c.flagged ? 'amber' : 'primary' })),
  }

  const bySchemeDonut = {
    title: 'Share of enrolment by scheme',
    unit: 'enrolled',
    annotation: 'Each centre splits its enrolment evenly across the schemes it runs. Use this to spot scheme concentration risk.',
    data: SCHEME_ROLLUP
      .map(s => ({ label: s.name, value: s.enrolled }))
      .sort((a, b) => b.value - a.value),
  }

  const byTrackBar = {
    title: 'Top tracks by enrolment (TP-wide)',
    unit: 'enrolled',
    orient: 'horizontal',
    color: 'violet',
    annotation: 'Across all 10 centres. Larger tracks ⇒ higher fixed-cost utilisation, but also more concentration risk if a sector dips.',
    data: TRACKS.slice(0, 8).map(t => ({ label: t.name, value: t.enrolled })),
  }

  const centreTable = {
    title: 'Centre-level enrolment · conversion rates',
    columns: [
      { key: 'name',       label: 'Centre' },
      { key: 'enrolled',   label: 'Enrolled',  type: 'number' },
      { key: 'trained',    label: 'Trained',   type: 'number' },
      { key: 'certified',  label: 'Certified', type: 'number' },
      { key: 'placed',     label: 'Placed',    type: 'number' },
      { key: 'placeRate',  label: 'Place %',   type: 'percent' },
    ],
    rows: filteredCentres.map(c => ({
      name: c.name,
      enrolled: c.enrolled,
      trained: c.trained,
      certified: c.certified,
      placed: c.placed,
      placeRate: Math.round(c.placed / Math.max(c.certified, 1) * 100),
    })),
    highlight: filteredCentres.some(c => c.flagged)
      ? 'Guwahati is below the TP-wide placement-rate median — investigate before next quarter.'
      : null,
  }

  const dashboard = (
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-violet-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-violet-700 inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> Training Partner · Enrolment
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres · {TP_ROLLUP.states} states</span>
          <span className="font-bold text-violet-700">{TP_ROLLUP.enrolled.toLocaleString('en-IN')} total enrolments</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard card={byCentreBar} />
          <DonutChartCard card={bySchemeDonut} />
        </div>

        <BarChartCard card={byTrackBar} />

        <DataTableCard card={centreTable} />

        {/* Ask Saathi nudge */}
        <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-violet-50/40 to-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-txt-primary">Want deeper analysis?</div>
            <div className="text-[11px] text-txt-secondary">Saathi can break this down by gender, age, social category, sector, or run forecasts.</div>
          </div>
          <button onClick={() => askSaathi('Project Q4 enrolment for this TP if current pace continues. Break it down by centre and scheme, and call out any centre that needs intervention.')}
            className="px-3 py-1.5 rounded-pill bg-violet-600 text-white text-[12px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
            <Sparkles className="w-3 h-3" /> Forecast Q4
          </button>
        </div>
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Enrolment"
      useWebSearch={false}
      extraSystem={
        `You are inside the ENROLMENT dashboard of Training Partner: ${TP_PROFILE.name}. ` +
        `Scope: ${TP_ROLLUP.centres} centres across ${TP_ROLLUP.states} states, ${TP_ROLLUP.enrolled.toLocaleString('en-IN')} total enrolments, schemes: ${TP_PROFILE.primarySchemes.join(', ')}. ` +
        `Current filter: centre=${centreFilter}, scheme=${schemeFilter}. ` +
        "Always scope analytical answers to THIS TP only. Emit ONE chart card (bar_chart / donut_chart / data_table / kpi_grid) per answer + an action_panel when a problem is surfaced. " +
        "If the user wants placement / retention / certification / scheme compliance, suggest opening that module."
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
        className="rounded-pill border border-bdr bg-white px-2 py-1 text-[11px] text-txt-primary outline-none focus:border-primary">
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}
