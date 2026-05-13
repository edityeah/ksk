// NSDC Admin placement dashboard — surfaces the *Confidence Score* on every
// placement row and the *Average TP confidence* on the top KPI strip.
//
// Confidence is admin-only. Learners and TPs never see this surface — gated
// by the role config (canvas only allowed for nsdc_officer / funder).
//
// Scheme filter scopes the 3-signal funnel + KPIs to the selected scheme.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { useApp } from '../../context/AppContext.jsx'
import ConfidenceBadge, { AverageConfidencePill } from '../../components/ConfidenceBadge.jsx'
import SchemeFilterBar, { schemeLabel } from '../../components/SchemeFilterBar.jsx'
import { averageConfidence, confidenceFor } from '../../utils/confidenceScore.js'
import { SCHEME_PLACEMENT_VERIFICATION } from './_schemeData.js'
import { ShieldCheck, AlertTriangle, Eye, Filter, Sparkles } from 'lucide-react'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import AvatarCall from '../../components/AvatarCall.jsx'

const PLACEMENT_QUICK_ASKS = [
  'Why is average placement confidence stuck at this level?',
  'Compare verified placements across schemes',
  'Which TPs have the lowest cert-to-place confidence?',
  'Audit candidates: placements with <40% confidence',
  'How many disputed placements need NSDC investigation?',
  'Walk me through the 3-signal verification funnel',
  'Why is PMKVY placement-confidence lower than DDU-GKY?',
  'Recommend a broadcast for ghost-placement audit',
]

export default function PlacementDashboardCanvas({ context }) {
  const [funnel, setFunnel] = useState([])
  const [placements, setPlacements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [riskOnly, setRiskOnly] = useState(false)
  const [scheme, setScheme] = useState('all')
  const [pending, setPending] = useState(null)
  const { role } = useApp() || {}
  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  useEffect(() => {
    api.placementFunnel().then(r => setFunnel(r.funnel || [])).catch(() => {})
    api.placements().then(r => setPlacements(r.placements || [])).catch(() => {})
  }, [])

  const adminLike = role === 'nsdc_officer' || role === 'funder' || role === 'ssc'
  // Scheme-scoped state counts come from the static cross-cut for now.
  // "all" → use real DB rows. Specific scheme → use the fixture for the demo
  // so the funder sees real per-scheme numbers.
  const stateCounts = scheme === 'all'
    ? placements.reduce((acc, p) => { acc[p.state] = (acc[p.state] || 0) + 1; return acc }, {})
    : { ...SCHEME_PLACEMENT_VERIFICATION[scheme] }
  const enriched = useMemo(() => placements.map(p => ({ ...p, _conf: confidenceFor(p) })), [placements])
  const avgConf = averageConfidence(enriched)
  const visible = useMemo(() => riskOnly ? enriched.filter(p => p._conf.score < 0.60) : enriched, [enriched, riskOnly])
  const auditCount = enriched.filter(p => p._conf.score < 0.60).length
  const selected = enriched.find(p => p.id === selectedId)

  const dashboard = (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Scheme scope */}
      {adminLike && (
        <div className="rounded-2xl border border-bdr-light bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-txt-tertiary mb-2">Scope · placement data by scheme</div>
          <SchemeFilterBar value={scheme} onChange={setScheme} />
          <div className="text-[11px] text-txt-secondary mt-2">
            Showing: <span className="font-bold text-txt-primary">{schemeLabel(scheme)}</span>
            {scheme !== 'all' && <span className="text-txt-tertiary"> · per-scheme fixtures (PMKVY / DDU-GKY / NAPS / SIB / PM Vishwakarma / RPL / PMNAP / Skill Hub)</span>}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {['claimed_unverified', 'partially_verified', 'verified', 'conflicted', 'disputed'].map(s => (
          <div key={s} className="rounded-2xl border border-bdr-light bg-white p-3">
            <div className="text-[10px] uppercase tracking-wider text-txt-secondary">{s.replace('_', ' ')}</div>
            <div className="text-[20px] font-bold mt-0.5">{stateCounts[s] || 0}</div>
          </div>
        ))}
        {adminLike && (
          <div className="rounded-2xl border border-bdr-light bg-gradient-to-br from-emerald-50 to-white p-3">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Avg confidence
            </div>
            <div className="text-[20px] font-bold mt-0.5 text-emerald-700">{Math.round(avgConf * 100)}%</div>
            <div className="text-[10px] text-txt-tertiary mt-0.5">{enriched.length} records</div>
          </div>
        )}
      </div>

      {/* Audit risk callout — admin only */}
      {adminLike && auditCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-amber-800">
              {auditCount} placement{auditCount === 1 ? '' : 's'} below 60% confidence — audit risk
            </div>
            <div className="text-[11px] text-amber-800/80">
              These are self-declared by the TP without independent learner / employer / document confirmation.
            </div>
          </div>
          <button onClick={() => setRiskOnly(v => !v)}
            className={`px-3 py-1.5 rounded-pill text-[12px] font-bold whitespace-nowrap ${riskOnly ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'}`}>
            <Filter className="w-3 h-3 inline -mt-0.5 mr-1" />
            {riskOnly ? 'Showing risk only' : 'Show risk only'}
          </button>
        </div>
      )}

      {/* Funnel */}
      <div>
        <h3 className="text-[13px] font-bold mb-2 text-txt-primary">3-signal verification funnel</h3>
        <div className="space-y-2">
          {funnel.map(f => (
            <div key={f.stage} className="rounded-2xl border border-bdr-light bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium">{f.stage}</div>
                <div className="text-[13px] font-mono tabular-nums">{f.count}</div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-pill bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (f.count / Math.max(funnel[0]?.count || 1, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placement table + side detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h3 className="text-[13px] font-bold mb-2 text-txt-primary inline-flex items-center gap-2">
            Recent placement claims
            {adminLike && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill">+ confidence</span>}
          </h3>
          <div className="rounded-2xl border border-bdr-light bg-white overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-page/50 text-[10px] uppercase tracking-wider text-txt-secondary">
                <tr>
                  <th className="text-left px-3 py-2">Trainee</th>
                  <th className="text-left px-3 py-2">Employer</th>
                  <th className="text-right px-3 py-2">CTC</th>
                  <th className="text-right px-3 py-2">State</th>
                  {adminLike && <th className="text-right px-3 py-2">Confidence</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 30).map(p => (
                  <tr key={p.id} className={`border-t border-bdr-light hover:bg-surface-page/40 cursor-pointer ${selectedId === p.id ? 'bg-primary-light/30' : ''}`}
                      onClick={() => setSelectedId(p.id)}>
                    <td className="px-3 py-2 font-medium">{p.trainee?.name || '—'}</td>
                    <td className="px-3 py-2 text-txt-secondary">{p.employer?.name || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{p.ctcMonthly?.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-txt-secondary">{p.state?.replace('_', ' ')}</td>
                    {adminLike && (
                      <td className="px-3 py-2 text-right">
                        <ConfidenceBadge score={p._conf.score} signals={p._conf.signals} compact />
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <Eye className="w-3.5 h-3.5 text-txt-tertiary inline" />
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={adminLike ? 6 : 5} className="px-3 py-6 text-center text-txt-secondary text-[12px]">No placements match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side: confidence ladder for selected placement (admin only) */}
        {adminLike && (
          <div>
            <h3 className="text-[13px] font-bold mb-2 text-txt-primary">Selected placement · confidence ladder</h3>
            {selected ? (
              <ConfidenceBadge score={selected._conf.score} signals={selected._conf.signals} />
            ) : (
              <div className="rounded-2xl border border-dashed border-bdr-light bg-surface-page/40 p-6 text-center text-[12px] text-txt-secondary">
                Click any row to inspect the verification ladder.
              </div>
            )}
            <p className="text-[10px] text-txt-tertiary mt-2 leading-relaxed">
              <ShieldCheck className="w-3 h-3 inline -mt-0.5" /> Confidence is computed independently of TP self-reporting.
              5 signals: TP declared · Learner confirmed · Document uploaded · Employer confirmed · EPFO/bank verified.
              Only visible to NSDC Admin / Funder roles.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // Saathi panel — full chat + voice + video + screen share. Knows the
  // current scheme scope so analytic answers + chart cards stay scoped.
  const chat = (
    <AvatarCall
      persona="general"
      title="Saathi · Placement"
      useWebSearch={true}
      extraSystem={
        "You are inside the PLACEMENT dashboard of the NSDC officer's KSK console.\n" +
        `Active scheme scope: ${schemeLabel(scheme)}.\n` +
        "For every analytic question, scope the answer to this scheme + the 3-signal verification model. " +
        "Quote actual numbers from your data pack. Emit ONE chart card per answer (kpi_grid / bar_chart / donut_chart / data_table) + an action_panel when a problem is surfaced. " +
        "If the user asks about a different dimension that lives in another module, suggest opening it (Enrollments / Retention / Training Partners)."
      }
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={PLACEMENT_QUICK_ASKS}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}
