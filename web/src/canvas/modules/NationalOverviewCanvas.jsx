// National Overview — mirrors the NSDC Academy Power BI "Overview" tab.
// 11 hero KPIs, 3-year funnel trend, top-10 courses, batch stages, TP types,
// top sectors. Saathi at the bottom can drill into any of these.

import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import LineChartCard  from '../../components/cards/LineChartCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const KPI_GRID = {
  title: 'NSDC Academy · National snapshot',
  items: [
    { label: 'Enrolled Candidates', value: '27,74,408', delta: '+12% YoY',     tone: 'primary' },
    { label: 'Trained',             value: '23,65,851', delta: '+9% YoY',      tone: 'sky' },
    { label: 'Assessed',            value: '20,06,118',                        tone: 'violet' },
    { label: 'Certified',           value: '13,80,856',                        tone: 'emerald' },
    { label: 'Placed',              value: '6,54,076',  delta: '-3% vs target', tone: 'amber' },
    { label: 'Training Partners',   value: '587',                              tone: 'rose' },
    { label: 'Training Centres',    value: '3,515',                            tone: 'indigo' },
    { label: 'Courses',             value: '4,770',                            tone: 'teal' },
    { label: 'Sectors',             value: '37',                               tone: 'fuchsia' },
    { label: 'Projects',            value: '504',                              tone: 'sky' },
    { label: 'Total Batches',       value: '5,89,762',                         tone: 'primary' },
  ],
}

const TREND = {
  title: 'Annual funnel · 2024-2026',
  xAxis: 'Year', yAxis: 'Candidates',
  annotation: 'Enrolment dipped 4% in 2026 vs 2025; placement numbers held — pipeline efficiency, not intake, is the lever.',
  series: [
    { name: 'Enrolled', color: 'primary', data: [{ x: '2024', y: 2100000 }, { x: '2025', y: 2900000 }, { x: '2026', y: 2774408 }] },
    { name: 'Trained',  color: 'sky',     data: [{ x: '2024', y: 1700000 }, { x: '2025', y: 2400000 }, { x: '2026', y: 2365851 }] },
    { name: 'Assessed', color: 'violet',  data: [{ x: '2024', y: 1400000 }, { x: '2025', y: 2050000 }, { x: '2026', y: 2006118 }] },
    { name: 'Certified',color: 'emerald', data: [{ x: '2024', y: 980000 },  { x: '2025', y: 1410000 }, { x: '2026', y: 1380856 }] },
    { name: 'Placed',   color: 'amber',   data: [{ x: '2024', y: 500000 },  { x: '2025', y: 680000 },  { x: '2026', y: 654076 }] },
  ],
}

const BATCH_STAGES = {
  title: 'Batch stages',
  unit: 'batches',
  annotation: '87.6% of batches have completed — strong throughput; ongoing pipeline at 72,678.',
  data: [
    { label: 'Completed', value: 516533, color: 'emerald' },
    { label: 'Ongoing',   value: 72678,  color: 'amber'  },
    { label: 'Upcoming',  value: 533,    color: 'sky'    },
  ],
}

const TP_TYPES = {
  title: 'Training Partner mix',
  unit: 'partners',
  annotation: 'Two-thirds of TPs are funded — concentration risk if scheme rules change.',
  data: [
    { label: 'Funded',     value: 385, color: 'primary' },
    { label: 'Both',       value: 106, color: 'emerald' },
    { label: 'Non-Funded', value: 96,  color: 'amber'  },
  ],
}

const TOP_COURSES = {
  title: 'Top 10 courses by enrolled',
  unit: 'candidates',
  orient: 'vertical',
  color: 'sky',
  annotation: 'Entry-tier digital roles dominate enrolment — Domestic Data Entry Operator leads at 95K.',
  data: [
    { label: 'Domestic Data Entry',  value: 95177 },
    { label: 'CCBP Intensive',       value: 62953 },
    { label: 'Gen AI Foundation',    value: 62564 },
    { label: 'General Housekeeper',  value: 56474 },
    { label: 'General Duty Assist.', value: 46473 },
    { label: 'Hindi Se Eng Seekho',  value: 45419 },
    { label: 'CCBP Academy',         value: 42838 },
    { label: 'Self-Employed Tailor', value: 34045 },
    { label: 'Web Development',      value: 34034 },
    { label: 'Retail Sales Assoc.',  value: 25115 },
  ],
}

const TOP_SECTORS = {
  title: 'Top 7 sectors by enrolled',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'IT-ITeS alone accounts for ~39% of national enrolment.',
  data: [
    { label: 'IT-ITeS',              value: 1078431 },
    { label: 'Management',           value: 250116 },
    { label: 'BFSI',                 value: 249913 },
    { label: 'Tourism & Hospitality',value: 155655 },
    { label: 'Healthcare',           value: 147037 },
    { label: 'Beauty & Wellness',    value: 136895 },
    { label: 'Electronics',          value: 109643 },
  ],
}

const QUICK_ASKS = [
  'Why did placements dip in 2026?',
  'Walk me through the 2024-2026 funnel — where did we leak the most?',
  'Top 10 courses — which deserve a broadcast to TPs?',
  'Compare placement conversion across the top sectors',
  'What\'s our exposure if funded-scheme rules change?',
  'Project 2027 numbers based on this trend',
  'Headline numbers vs national skill mission targets',
  'Where is throughput stalling in the ongoing batches?',
]

export default function NationalOverviewCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · OVERVIEW"
      title="Good morning. Here's where the country stands."
      subtitle="11 headline KPIs, 3-year funnel, sector + course + batch breakdowns."
      toneClass="from-primary-light/50 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="04/05/2026"
      saathiTitle="Saathi · National Overview"
      saathiContext="The user is inside the National Overview module. Default to KPI/funnel/sector/course/batch-related answers. If they ask about specific TPs, suggest opening the Training Partners module instead."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={KPI_GRID} />,    prompt: 'Walk me through these national KPIs and flag any anomalies.' },
        { node: <LineChartCard card={TREND} />,     prompt: 'Walk me through the 2024-2026 funnel. Where did we leak the most candidates?',  span: 'half' },
        { node: <BarChartCard card={TOP_SECTORS} />,prompt: 'Top sectors by enrolled — what is the placement conversion in each?',           span: 'half' },
        { node: <DonutChartCard card={BATCH_STAGES} />, prompt: 'Batch stages — what should I worry about in the 12% ongoing batches?',     span: 'half' },
        { node: <DonutChartCard card={TP_TYPES} />, prompt: 'TP mix — what is our exposure if funded-scheme rules change?',                  span: 'half' },
        { node: <BarChartCard card={TOP_COURSES} />, prompt: 'Top 10 courses — which deserve a broadcast to TPs to scale further?' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
