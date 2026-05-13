// Apprenticeships (NAPS) — single canvas with 7 sub-tabs mirroring the
// NSDC Apprenticeship Power BI dashboard (Overview, Establishment, Candidate,
// TPA, Sector, Analytics, DBT). Always-visible filter bar below the tabs.
// Resizable Saathi chat at the bottom — knows the current tab + filters and
// answers analyst questions scoped to them.

import { useMemo, useState } from 'react'
import AvatarCall from '../../components/AvatarCall.jsx'
import ResizableSaathiSplit from '../../components/ResizableSaathiSplit.jsx'
import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import LineChartCard  from '../../components/cards/LineChartCard.jsx'
import DataTableCard  from '../../components/cards/DataTableCard.jsx'
import FilterBar, { defaultFilters, filtersSummary, activeFilterCount } from './_apprenticeship/FilterBar.jsx'
import * as D from './_apprenticeship/data.js'
import { Sparkles, FlaskConical, Info } from 'lucide-react'

const TABS = [
  { key: 'overview',      label: 'Overview' },
  { key: 'establishment', label: 'Establishment' },
  { key: 'candidate',     label: 'Candidate' },
  { key: 'tpa',           label: 'TPA' },
  { key: 'sector',        label: 'Sector' },
  { key: 'analytics',     label: 'Analytics' },
  { key: 'dbt',           label: 'DBT' },
]

const QUICK_ASKS_BY_TAB = {
  overview: [
    'Walk me through the NAPS national snapshot — flag the biggest concentration risk',
    'Which states are punching below their weight on apprenticeship engagement?',
    'Why is female participation stuck at 22%? Action plan?',
    'Top 10 enrolled courses — which deserve TPA push?',
    'FY-26-27 has just begun. What\'s the trajectory if FY-25-26 holds?',
    'SC + ST under-share. Recommend a reservation-correction broadcast.',
  ],
  establishment: [
    'Why is the active/registered ratio falling? Investigate',
    'Co-Op shows more active than registered — data-quality flag root cause',
    'Workforce-strength concentration — micro + cottage are <8% of base. Push plan?',
    'Why is Maharashtra running 14K establishments — diversification ask',
    'Top 3 states by registered establishments vs active conversion',
    'Live vacancies 6.34 L but engagement 51 L — gap analysis',
  ],
  candidate: [
    'Why did FY-25-26 spike to 30.7 L registrations? What changed?',
    'Average age is 26. Below-22 cohort thin — apprenticeship-for-students plan?',
    'Bihar has 4.28 L candidates but limited TPAs. Match plan?',
    'PwD candidates 64K of 15.7 M (0.4%) — outreach gap',
    'Female-to-male registration ratio · trend over FYs',
    'e-KYC pending 14.7 M of 15.7 M — drive plan',
  ],
  tpa: [
    '140 TPAs deliver <50% completion. Audit list + broadcast',
    'Maharashtra 76 TPAs · 28% of national. Diversification ask',
    'Private TPA dominance 234/276 — risk of policy shift',
    '>30% dropout TPAs — top 10 by name + remedial plan',
    'TPAs in low-density states (≤4) — onboarding push plan',
    'Certified growth 2.3× in 2 yrs — sustainable trajectory?',
  ],
  sector: [
    'IT-ITeS women engagement 219K — replicate model for Automotive',
    'NSQF 4 + 5 dominate. NSQF 6-7 only 25 courses. Advanced skill push?',
    '52 sectors active but top-10 take 65% engagement. Diversify how?',
    'Saptarishi 609 vs Non-NSQF 121 — alignment plan',
    'PwD courses only 10 of 924 — scale-up roadmap',
    'Construction has 135 courses but low women (12K). Inclusion plan',
  ],
  analytics: [
    'Decomposition: General × Male × FY-23-24 × Maharashtra × Pune = 52K. Drill further',
    '2.3 M candidates apply <5 times — disengagement curve. Re-activation plan',
    'Applications 2024 = 4.28 M, 2025 = 2.97 M (-30%). Investigate cause',
    'NSQF 3 + 4 dominate engagement. NSQF 5 lags. Course-ladder fix?',
    'OT vs DT assessments — comparative trajectory',
    'e-KYC completion compounding — projected by FY-26-27 end',
  ],
  dbt: [
    'DBT Paid ₹775.94 Cr cumulative. Per-apprentice avg + leakage rate?',
    'Aadhaar-bank failures share — which states drive the failure tail?',
    'DBT delivered vs eligible cohort gap',
    'Disbursal monthly variance — flag the volatile months',
    'Top 5 reasons for DBT rejection — broadcast remedial',
  ],
}

export default function ApprenticeshipsCanvas({ context }) {
  const [tab, setTab] = useState(context?.tab || 'overview')
  const [filters, setFilters] = useState(defaultFilters())
  const [pending, setPending] = useState(null)

  const askSaathi = (text) => setPending({ text, nonce: Date.now() })

  // Saathi extraSystem includes current tab + filter state, so when the user
  // asks "show me trend" it scopes to FY=23-24 / Maharashtra / etc.
  const extraSystem = useMemo(() => {
    const filterLine = filtersSummary(filters)
    return [
      'You are inside the APPRENTICESHIPS (NAPS) module of the NSDC officer\'s KSK dashboard.',
      `Current sub-dashboard: ${tab.toUpperCase()}.`,
      `Active filter scope: ${filterLine}.`,
      'When the user asks an analytic question, SCOPE your answer to the active filter (mention the scope explicitly in 1 short sentence, then emit ONE chart card). If the user changes their question to a different scope, suggest applying the matching filter via chips.',
    ].join('\n')
  }, [tab, filters])

  const dashboard = (
    <div className="h-full flex flex-col bg-white">
      {/* Hero */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-br from-orange-50/70 via-white to-white border-b border-bdr-light flex-shrink-0">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-orange-700">
          National Apprenticeship Promotion Scheme · NAPS
        </div>
        <h2 className="text-[22px] font-bold text-txt-primary leading-tight mt-1">
          Apprenticeship Performance Dashboard
        </h2>
        <div className="text-[12px] text-txt-secondary mt-1">
          Talk to your NAPS dashboard. Tab through Overview · Establishment · Candidate · TPA · Sector · Analytics · DBT.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-3 pt-2 bg-white border-b border-bdr-light overflow-x-auto">
        <div className="flex gap-1 min-w-min">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-[12px] font-bold rounded-t-xl whitespace-nowrap transition border-b-2 ${
                tab === t.key
                  ? 'text-orange-700 border-orange-600 bg-orange-50/60'
                  : 'text-txt-secondary border-transparent hover:text-txt-primary hover:bg-surface-page/50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        showEstabType={tab === 'establishment'}
      />

      {/* Active filter recap + demo note */}
      <div className="flex-shrink-0 px-4 py-1.5 bg-orange-50/30 border-b border-bdr-light text-[10px] text-txt-secondary inline-flex items-center gap-1.5 flex-wrap">
        <Info className="w-3 h-3 text-orange-600 flex-shrink-0" />
        <span className="font-bold">Scope:</span> {filtersSummary(filters)}
        {activeFilterCount(filters) === 0 && (
          <span className="text-txt-tertiary">{"· (pick filters above to scope Saathi's answers)"}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-txt-tertiary">
          <FlaskConical className="w-3 h-3" /> Demo data · filters scope Saathi, dashboard fixtures stay constant
        </span>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {tab === 'overview'      && <OverviewTab      ask={askSaathi} />}
        {tab === 'establishment' && <EstablishmentTab ask={askSaathi} />}
        {tab === 'candidate'     && <CandidateTab     ask={askSaathi} />}
        {tab === 'tpa'           && <TPATab           ask={askSaathi} />}
        {tab === 'sector'        && <SectorTab        ask={askSaathi} />}
        {tab === 'analytics'     && <AnalyticsTab     ask={askSaathi} />}
        {tab === 'dbt'           && <DBTTab           ask={askSaathi} />}
      </div>
    </div>
  )

  const chat = (
    <AvatarCall
      persona="general"
      title={`Saathi · NAPS ${TABS.find(t => t.key === tab)?.label || ''}`}
      useWebSearch={true}
      extraSystem={extraSystem}
      pendingPrompt={pending}
      threadId={context?.threadId}
      quickAsks={QUICK_ASKS_BY_TAB[tab] || []}
    />
  )

  return <ResizableSaathiSplit top={dashboard} bottom={chat} />
}

// ── Cell wrapper: hover-reveal "Ask Saathi" affordance ──
function Cell({ children, prompt, ask }) {
  return (
    <div className="group relative">
      {children}
      <button
        onClick={() => ask(prompt)}
        title="Ask Saathi about this"
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-pill bg-orange-600/90 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition shadow-card hover:bg-orange-600"
      >
        <Sparkles className="w-3 h-3" /> Ask Saathi
      </button>
    </div>
  )
}

// ── Tabs ──

function OverviewTab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through these NAPS national KPIs and flag any anomalies." ask={ask}>
        <KpiGridCard card={D.OVERVIEW_KPIS} />
      </Cell>
      <Cell prompt="Walk me through the 9-year engagement funnel. Where do dropouts spike?" ask={ask}>
        <LineChartCard card={D.ENGAGEMENT_TREND} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="State ranking — recommend a TPA-density correction plan for bottom states." ask={ask}>
          <BarChartCard card={D.STATE_RANKING} />
        </Cell>
        <Cell prompt="Top 10 courses — which 3 should we broadcast to TPAs to scale?" ask={ask}>
          <BarChartCard card={D.TOP_COURSES} />
        </Cell>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="Female participation gap of 22%. Per-sector breakdown + plan to lift it." ask={ask}>
          <DonutChartCard card={D.GENDER_DONUT} />
        </Cell>
        <Cell prompt="SC + ST under-share vs population. Reservation-aware broadcast plan." ask={ask}>
          <DonutChartCard card={D.SOCIAL_CATEGORY} />
        </Cell>
      </div>
      <Cell prompt="Top 10 sectors — concentration on Automotive 20%. Diversification roadmap." ask={ask}>
        <BarChartCard card={D.TOP_SECTORS} />
      </Cell>
      <Cell prompt="Qualification distribution — ITI + 10th = 50%. Implications for course design." ask={ask}>
        <BarChartCard card={D.QUALIFICATION_BREAKDOWN} />
      </Cell>
    </>
  )
}

function EstablishmentTab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through the establishment footprint. Flag the biggest data-quality gap." ask={ask}>
        <KpiGridCard card={D.ESTAB_KPIS} />
      </Cell>
      <Cell prompt="Why is the active/registered ratio falling? 5-year trend deep-dive." ask={ask}>
        <LineChartCard card={D.ESTAB_TREND} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="Geography skew — Maharashtra is 14K. Top-3 states action plan." ask={ask}>
          <BarChartCard card={D.ESTAB_GEOGRAPHY} />
        </Cell>
        <Cell prompt="Workforce-size distribution. Why are micro + cottage <8%? Inclusion plan." ask={ask}>
          <DonutChartCard card={D.ESTAB_CATEGORY} />
        </Cell>
      </div>
      <Cell prompt="Co-Op shows MORE active than registered. Data-quality root cause + audit." ask={ask}>
        <DataTableCard card={D.ESTAB_BY_TYPE} />
      </Cell>
    </>
  )
}

function CandidateTab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through candidate registry stats. e-KYC bottleneck plan?" ask={ask}>
        <KpiGridCard card={D.CAND_KPIS} />
      </Cell>
      <Cell prompt="Why did FY-25-26 spike to 30.7 L? Investigate the campaign that worked." ask={ask}>
        <BarChartCard card={D.CAND_REG_BY_FY} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="Age skew · 23-32 dominates. 14-17 cohort thin. Apprenticeship-for-students plan." ask={ask}>
          <BarChartCard card={D.CAND_BY_AGE} />
        </Cell>
        <Cell prompt="Qualification mix · vocational pipeline. Course-design implications." ask={ask}>
          <BarChartCard card={D.CAND_BY_QUAL} />
        </Cell>
      </div>
      <Cell prompt="State distribution · bottom-half states have <30K. Outreach plan." ask={ask}>
        <BarChartCard card={D.CAND_BY_STATE} />
      </Cell>
    </>
  )
}

function TPATab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through TPA performance. Flag the bottom-quartile audit list." ask={ask}>
        <KpiGridCard card={D.TPA_KPIS} />
      </Cell>
      <Cell prompt="Certified apprentices grew 2.3× in 2 yrs. Sustainable? Project FY-24-25." ask={ask}>
        <LineChartCard card={D.TPA_CERTIFIED_TREND} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="Empaneled TPAs by entity type. Private 234/276 — concentration risk." ask={ask}>
          <DonutChartCard card={D.TPA_BY_ESTAB_TYPE} />
        </Cell>
        <Cell prompt="TPAs by state · Maharashtra 28%. Diversify to under-served states." ask={ask}>
          <BarChartCard card={D.TPA_BY_STATE} />
        </Cell>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="50% of TPAs have <50% completion. Audit candidates + remedial broadcast." ask={ask}>
          <BarChartCard card={D.TPA_COMPLETION} />
        </Cell>
        <Cell prompt="100 TPAs have >30% dropout. Place-out support plan." ask={ask}>
          <BarChartCard card={D.TPA_DROPOUT} />
        </Cell>
      </div>
    </>
  )
}

function SectorTab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through the sector landscape. NSQF-aligned 803 vs Non-NSQF 121 — strategy?" ask={ask}>
        <KpiGridCard card={D.SECTOR_KPIS} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="NSQF 4-5 dominate course supply. NSQF 6-7 scarce. Advanced-skill push plan." ask={ask}>
          <BarChartCard card={D.SECTOR_NSQF} />
        </Cell>
        <Cell prompt="Per-sector course count. Why does Healthcare have only 106 courses?" ask={ask}>
          <BarChartCard card={D.SECTOR_COURSES} />
        </Cell>
      </div>
      <Cell prompt="IT-ITeS engages 219K women. Replicate the model in Construction (12K) + Manufacturing." ask={ask}>
        <BarChartCard card={D.SECTOR_WOMEN} />
      </Cell>
      <Cell prompt="Top 10 women-friendly courses are white-collar. Push for trade-role inclusion." ask={ask}>
        <BarChartCard card={D.SECTOR_TOP_WOMEN_COURSES} />
      </Cell>
    </>
  )
}

function AnalyticsTab({ ask }) {
  return (
    <>
      <Cell prompt="Walk me through this decomposition. Which dimension reveals the biggest story?" ask={ask}>
        <KpiGridCard card={D.ANALYTICS_KPIS} />
      </Cell>
      <Cell prompt="Applications dropped 30% from 2024 to 2025. Investigate the cause." ask={ask}>
        <LineChartCard card={D.ANALYTICS_APPS_GENERATED} />
      </Cell>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Cell prompt="NSQF level engagement distribution. NSQF 5 lags vs course supply. Why?" ask={ask}>
          <BarChartCard card={D.ANALYTICS_NSQF} />
        </Cell>
        <Cell prompt="2.3 M candidates apply <5 times. Re-engagement playbook." ask={ask}>
          <BarChartCard card={D.ANALYTICS_APPLICATIONS} />
        </Cell>
      </div>
    </>
  )
}

function DBTTab({ ask }) {
  return (
    <>
      <Cell prompt="DBT Paid cumulative ₹775.94 Cr. Per-apprentice avg + leakage analysis." ask={ask}>
        <KpiGridCard card={D.DBT_KPIS} />
      </Cell>
      <div className="rounded-2xl border border-dashed border-bdr p-6 text-center text-[13px] text-txt-secondary bg-surface-page/40">
        <div className="font-bold text-txt-primary mb-1">Granular DBT data not in current data mart</div>
        <div className="text-[12px]">
          Ask Saathi for state-wise disbursal patterns, Aadhaar-bank failures, retry queues, top 5 rejection reasons — the agent can pull from NSDC/PFMS sources via web search.
        </div>
      </div>
    </>
  )
}
