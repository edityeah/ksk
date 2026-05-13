// TP Certification — Magic Bus India Foundation certification dashboard
// scoped to THIS TP. Tracks the trained → assessed → certified leg of the
// funnel where most TPs lose visibility.
//
// Sections:
//   • Hero with TP brand + headline certified number
//   • KPI grid (trained / certified / cert rate / pending assessment)
//   • Filter chips (centre / track)
//   • Bar chart — certification rate by centre
//   • Donut — certified by track
//   • Data table — track-level cert breakdown
//   • Saathi chat

import { useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES, TRACKS } from './_tp/data.js'
import { GraduationCap, MapPin, Building2, Filter, Sparkles, AlertTriangle } from 'lucide-react'

const QUICK_ASKS = [
  'Which centre has the weakest cert rate?',
  'Which tracks fail most often in assessment?',
  'How many trainees are stuck awaiting assessment?',
  'Forecast next month\'s cert pipeline',
  'Compare cert rate centre by centre',
  'Recommend remediation for low-cert centres',
  'Which assessors do my centres use most?',
  'Plan an assessor calibration session',
]

export default function TpCertificationCanvas({ context }) {
  const [pending, setPending] = useState(null)
  const [centreFilter, setCentreFilter] = useState('all')
  const [trackFilter, setTrackFilter] = useState('all')
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  const allTrackNames = useMemo(() => TRACKS.map(t => t.name), [])

  const filteredCentres = useMemo(() => {
    return CENTRES.filter(c =>
      (centreFilter === 'all' || c.id === centreFilter) &&
      (trackFilter === 'all' || c.tracks.includes(trackFilter))
    )
  }, [centreFilter, trackFilter])

  const totals = useMemo(() => filteredCentres.reduce((acc, c) => ({
    trained:   acc.trained   + c.trained,
    certified: acc.certified + c.certified,
  }), { trained: 0, certified: 0 }), [filteredCentres])

  const pendingAssessment = totals.trained - totals.certified
  const certRate = totals.trained ? Math.round(totals.certified / totals.trained * 100) : 0

  const kpiCard = {
    title: 'Certification funnel · filtered scope',
    items: [
      { label: 'Trained',           value: totals.trained.toLocaleString('en-IN'),   tone: 'sky' },
      { label: 'Certified',         value: totals.certified.toLocaleString('en-IN'), tone: 'emerald' },
      { label: 'Cert rate',         value: `${certRate}%`,                            delta: certRate >= 85 ? '↑ healthy' : certRate >= 75 ? 'on target' : '↓ below target', tone: certRate >= 85 ? 'emerald' : certRate >= 75 ? 'sky' : 'amber' },
      { label: 'Awaiting assessment', value: pendingAssessment.toLocaleString('en-IN'), tone: 'amber' },
      { label: 'Centres in scope',  value: filteredCentres.length.toString(),         tone: 'indigo' },
      { label: 'Tracks across centres', value: new Set(filteredCentres.flatMap(c => c.tracks)).size.toString(), tone: 'violet' },
    ],
  }

  const byCentreBar = {
    title: 'Certification rate by centre',
    annotation: 'Bars show % of trained learners who completed certification. Anything under 75% should be triaged.',
    unit: '%',
    color: 'emerald',
    data: filteredCentres
      .slice()
      .sort((a, b) => (b.certified / Math.max(b.trained, 1)) - (a.certified / Math.max(a.trained, 1)))
      .map(c => {
        const rate = Math.round(c.certified / Math.max(c.trained, 1) * 100)
        return { label: c.city, value: rate, color: rate >= 85 ? 'emerald' : rate >= 75 ? 'sky' : 'amber' }
      }),
  }

  const byTrackDonut = {
    title: 'Certified learners by track',
    unit: 'certified',
    annotation: 'Where your certification volume actually lands. Concentration here = sector risk if hiring tightens.',
    data: TRACKS.slice(0, 8).map(t => ({ label: t.name, value: t.certified })),
  }

  const trackTable = {
    title: 'Track-level certification — TP-wide',
    columns: [
      { key: 'name',      label: 'Track' },
      { key: 'centres',   label: 'Centres',    type: 'number' },
      { key: 'trained',   label: 'Trained',    type: 'number' },
      { key: 'certified', label: 'Certified',  type: 'number' },
      { key: 'certRate',  label: 'Cert %',     type: 'percent' },
    ],
    rows: TRACKS.map(t => ({
      name: t.name,
      centres: t.centres,
      trained: t.trained,
      certified: t.certified,
      certRate: Math.round(t.certified / Math.max(t.trained, 1) * 100),
    })),
  }

  const lowCentres = filteredCentres.filter(c => (c.certified / Math.max(c.trained, 1)) < 0.78)

  const dashboard = (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-emerald-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-700 inline-flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> Training Partner · Certification
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres</span>
          <span className="font-bold text-emerald-700">{TP_ROLLUP.certified.toLocaleString('en-IN')} certified · {Math.round(TP_ROLLUP.certified / TP_ROLLUP.trained * 100)}% of trained</span>
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
            <FilterPicker label="Track" value={trackFilter} onChange={setTrackFilter}
              options={[{ id: 'all', name: 'All tracks' }, ...allTrackNames.map(n => ({ id: n, name: n }))]} />
            {(centreFilter !== 'all' || trackFilter !== 'all') && (
              <button onClick={() => { setCentreFilter('all'); setTrackFilter('all') }}
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
                {lowCentres.length} centre{lowCentres.length === 1 ? '' : 's'} below 78% cert rate
              </div>
              <div className="text-[11px] text-amber-800/80">{lowCentres.map(c => c.name).join(' · ')}</div>
            </div>
            <button onClick={() => askSaathi(`Why are these centres below cert-rate target: ${lowCentres.map(c => c.name).join(', ')}? Recommend a remediation plan per centre.`)}
              className="px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-700 flex-shrink-0">
              <Sparkles className="w-3 h-3" /> Investigate
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard card={byCentreBar} />
          <DonutChartCard card={byTrackDonut} />
        </div>

        <DataTableCard card={trackTable} />
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Certification"
      useWebSearch={false}
      extraSystem={
        `You are inside the CERTIFICATION dashboard of Training Partner: ${TP_PROFILE.name}. ` +
        `Scope: ${TP_ROLLUP.centres} centres, ${TP_ROLLUP.trained.toLocaleString('en-IN')} trained, ${TP_ROLLUP.certified.toLocaleString('en-IN')} certified (~${Math.round(TP_ROLLUP.certified/TP_ROLLUP.trained*100)}%). ` +
        `Current filter: centre=${centreFilter}, track=${trackFilter}. ` +
        "Scope every analytical answer to THIS TP. Emit ONE chart card per answer + action_panel when a problem is surfaced. " +
        "Suggest opening Enrollment / Placement / Retention / Schemes when the question lives there."
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
