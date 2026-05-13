// TP Placement — Magic Bus India Foundation placement dashboard scoped to
// THIS TP. The TP-side view of the placement story (the funder sees the
// cross-TP version under NSDC Officer / Placement).
//
// Important: TP does NOT see "confidence score" (that's NSDC Admin-only).
// What the TP gets is their own filing pipeline + verification states +
// where to chase missing learner / employer confirmations.

import { useMemo, useState } from 'react'
import KpiGridCard from '../../components/cards/KpiGridCard.jsx'
import BarChartCard from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard from '../../components/cards/DataTableCard.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'
import { TP_PROFILE, TP_ROLLUP, CENTRES, SCHEME_ROLLUP } from './_tp/data.js'
import { Handshake, MapPin, Building2, Filter, Sparkles, Bell, AlertTriangle, ArrowRight } from 'lucide-react'

const QUICK_ASKS = [
  'Which centre has the weakest placement rate?',
  'How many placements are pending learner confirmation?',
  'Show me top hiring employers across my centres',
  'Compare PMKVY vs DDU-GKY placement outcomes',
  'Send broadcast to centres with unfiled placements',
  'Project Q4 placement count at current pace',
  'Which tracks place fastest after certification?',
  'Recommend a remediation plan for Guwahati',
]

// Synthetic verification-state distribution so the TP sees their own filing
// health (these are NOT the NSDC confidence scores — those stay admin-only).
function vStates(c) {
  // Roughly: 60% verified, 20% partial, 12% unverified, 5% conflicted, 3% disputed.
  // Skewed worse for flagged centres.
  const placed = c.placed
  if (c.flagged) return {
    verified:    Math.round(placed * 0.42),
    partial:     Math.round(placed * 0.24),
    unverified:  Math.round(placed * 0.22),
    conflicted:  Math.round(placed * 0.08),
    disputed:    Math.round(placed * 0.04),
  }
  return {
    verified:    Math.round(placed * 0.62),
    partial:     Math.round(placed * 0.20),
    unverified:  Math.round(placed * 0.12),
    conflicted:  Math.round(placed * 0.04),
    disputed:    Math.round(placed * 0.02),
  }
}

export default function TpPlacementCanvas({ context }) {
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
    let placed = 0, certified = 0
    const v = { verified: 0, partial: 0, unverified: 0, conflicted: 0, disputed: 0 }
    for (const c of filteredCentres) {
      placed    += c.placed
      certified += c.certified
      const s = vStates(c)
      for (const k of Object.keys(v)) v[k] += s[k]
    }
    return { placed, certified, ...v }
  }, [filteredCentres])

  const placeRate = totals.certified ? Math.round(totals.placed / totals.certified * 100) : 0
  const verifiedRate = totals.placed ? Math.round(totals.verified / totals.placed * 100) : 0

  const kpiCard = {
    title: 'Placement health · filtered scope',
    items: [
      { label: 'Placed',              value: totals.placed.toLocaleString('en-IN'),     tone: 'primary' },
      { label: 'Place rate',          value: `${placeRate}%`, delta: placeRate >= 70 ? 'on target' : '↓ below target', tone: placeRate >= 70 ? 'emerald' : 'amber' },
      { label: 'Independently verified', value: totals.verified.toLocaleString('en-IN'), delta: `${verifiedRate}% of placed`, tone: 'emerald' },
      { label: 'Partially verified',  value: totals.partial.toLocaleString('en-IN'),    tone: 'sky' },
      { label: 'Unverified',          value: totals.unverified.toLocaleString('en-IN'), delta: 'needs learner / employer confirm', tone: 'amber' },
      { label: 'Conflicted / disputed', value: (totals.conflicted + totals.disputed).toLocaleString('en-IN'), tone: 'rose' },
    ],
  }

  const byCentreBar = {
    title: 'Place rate by centre (placed / certified)',
    unit: '%',
    color: 'primary',
    annotation: 'Bars under 60% are audit-risk for the next NSDC review window.',
    data: filteredCentres
      .slice()
      .sort((a, b) => (b.placed / Math.max(b.certified, 1)) - (a.placed / Math.max(a.certified, 1)))
      .map(c => {
        const rate = Math.round(c.placed / Math.max(c.certified, 1) * 100)
        return { label: c.city, value: rate, color: rate >= 75 ? 'emerald' : rate >= 60 ? 'sky' : 'amber' }
      }),
  }

  const verifStateDonut = {
    title: 'Verification state of placements',
    unit: 'placements',
    annotation: 'Unverified rows are at risk if NSDC audits before learner / employer confirms. Chase these first.',
    data: [
      { label: 'Verified',    value: totals.verified,   color: 'emerald' },
      { label: 'Partial',     value: totals.partial,    color: 'sky' },
      { label: 'Unverified',  value: totals.unverified, color: 'amber' },
      { label: 'Conflicted',  value: totals.conflicted, color: 'rose' },
      { label: 'Disputed',    value: totals.disputed,   color: 'violet' },
    ].filter(d => d.value > 0),
  }

  const bySchemeBar = {
    title: 'Placement by scheme · TP-wide',
    annotation: 'Each centre splits placements proportionally across schemes it runs.',
    unit: 'placed',
    color: 'violet',
    orient: 'horizontal',
    data: SCHEME_ROLLUP.map(s => ({ label: s.name, value: s.placed })).sort((a, b) => b.value - a.value),
  }

  const centreTable = {
    title: 'Centre-level placement filing pipeline',
    columns: [
      { key: 'name',       label: 'Centre' },
      { key: 'placed',     label: 'Placed',     type: 'number' },
      { key: 'verified',   label: 'Verified',   type: 'number' },
      { key: 'unverified', label: 'Unverified', type: 'number' },
      { key: 'rate',       label: 'Place %',    type: 'percent' },
    ],
    rows: filteredCentres.map(c => {
      const s = vStates(c)
      return {
        name: c.name,
        placed: c.placed,
        verified: s.verified,
        unverified: s.unverified + s.partial,
        rate: Math.round(c.placed / Math.max(c.certified, 1) * 100),
      }
    }),
    highlight: totals.unverified > 1000
      ? `${totals.unverified.toLocaleString('en-IN')} placements still need learner or employer confirmation — nudge them before quarter close.`
      : null,
  }

  const dashboard = (
    <div className="h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-rose-50/70 via-white to-white border-b border-bdr-light">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-rose-700 inline-flex items-center gap-1">
          <Handshake className="w-3 h-3" /> Training Partner · Placement
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">{TP_PROFILE.name}</h2>
        <div className="text-[12px] text-txt-secondary mt-1 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />HQ: {TP_PROFILE.hq}</span>
          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{TP_ROLLUP.centres} centres</span>
          <span className="font-bold text-rose-700">{TP_ROLLUP.placed.toLocaleString('en-IN')} placed · {Math.round(TP_ROLLUP.placed / TP_ROLLUP.certified * 100)}% of certified</span>
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

        {totals.unverified > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-amber-800">
                {totals.unverified.toLocaleString('en-IN')} placements awaiting learner / employer confirmation
              </div>
              <div className="text-[11px] text-amber-800/80">
                Self-declared filings stay risk-flagged until at least one independent signal lands. Send a nudge cycle now.
              </div>
            </div>
            <button onClick={() => askSaathi('Draft a nudge cycle to all my centres reminding them to push learner+employer confirmations on unverified placements before quarter close. Emit an action_panel I can dispatch.')}
              className="px-3 py-1.5 rounded-pill bg-amber-600 text-white text-[11px] font-bold inline-flex items-center gap-1 hover:bg-amber-700 flex-shrink-0">
              <Bell className="w-3 h-3" /> Plan nudge cycle <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard card={byCentreBar} />
          <DonutChartCard card={verifStateDonut} />
        </div>

        <BarChartCard card={bySchemeBar} />

        <DataTableCard card={centreTable} />

        <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-rose-50/40 to-white p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-txt-primary">What can I do right now?</div>
            <div className="text-[11px] text-txt-secondary">Saathi can draft a centre-by-centre placement-recovery plan with concrete nudges, broadcasts, and assessor reviews.</div>
          </div>
          <button onClick={() => askSaathi('Build a centre-by-centre placement-recovery plan for this TP. Rank centres by gap, list the 2 specific actions for each centre, and put the lot into an action_panel.')}
            className="px-3 py-1.5 rounded-pill bg-rose-600 text-white text-[12px] font-bold inline-flex items-center gap-1 hover:opacity-90 flex-shrink-0">
            <Sparkles className="w-3 h-3" /> Recovery plan
          </button>
        </div>
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · TP Placement"
      useWebSearch={false}
      extraSystem={
        `You are inside the PLACEMENT dashboard of Training Partner: ${TP_PROFILE.name}. ` +
        `Scope: ${TP_ROLLUP.centres} centres, ${TP_ROLLUP.placed.toLocaleString('en-IN')} placed (~${Math.round(TP_ROLLUP.placed/TP_ROLLUP.certified*100)}% of certified). ` +
        `Current filter: centre=${centreFilter}, scheme=${schemeFilter}. ` +
        "Do NOT show NSDC confidence scores in this view (those are admin-only). Instead show this TP's filing pipeline + verification states. " +
        "Emit ONE chart card per answer + action_panel when a problem is surfaced. Scope every answer to THIS TP only."
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
