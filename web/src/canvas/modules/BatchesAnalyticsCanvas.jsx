// Batches — mirrors NSDC Academy "Batches" tab.
// Top TPs by batch volume, batches by state, scheme split (MLP / Fee Based),
// sector-wise batches + trained dual view, batch stages, top courses.

import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const HEADLINE = {
  title: 'Batch operations · 5,89,762 batches nationally',
  items: [
    { label: 'Total Batches',     value: '5,89,762', tone: 'primary' },
    { label: 'Completed',         value: '5,16,533', tone: 'emerald' },
    { label: 'Ongoing',           value: '72,678',   tone: 'amber' },
    { label: 'Upcoming',          value: '533',      tone: 'sky' },
    { label: 'MLP scheme batches',value: '5,62,065', tone: 'primary' },
    { label: 'Fee-Based batches', value: '27,697',   tone: 'rose' },
  ],
}

const BATCHES_BY_TP = {
  title: 'Top 12 TPs by batch count',
  unit: 'batches',
  orient: 'vertical',
  color: 'primary',
  annotation: 'Scholiverse runs 2.87 L batches — 48% of national total. Single-TP concentration is the headline risk.',
  data: [
    { label: 'Scholiverse Educare',    value: 287318 },
    { label: 'Nxtwave Disruptive',     value: 106827 },
    { label: 'Entri Software',         value: 23180 },
    { label: 'Sisinty Private Ltd',    value: 22493 },
    { label: 'Urban Company',          value: 18461 },
    { label: 'VLCC Limited',           value: 17558 },
    { label: 'Sunrise Mentors',        value: 16716 },
    { label: 'Frankfinn Aviation',     value: 5655 },
    { label: 'Sunstone Education Tech',value: 5599 },
    { label: 'Step Ahead Foundation',  value: 5026 },
    { label: 'Jetking Infotrain',      value: 3396 },
    { label: 'Mahendra Skills Training', value: 3323 },
  ],
}

const BATCHES_BY_STATE = {
  title: 'Top 12 states by batch count',
  unit: 'batches',
  orient: 'horizontal',
  color: 'sky',
  annotation: 'Haryana leads at 3.13 L batches — 53% of national total. Geographic concentration mirrors TP concentration.',
  data: [
    { label: 'Haryana',          value: 313541 },
    { label: 'Telangana',        value: 110206 },
    { label: 'Kerala',           value: 29648 },
    { label: 'Karnataka',        value: 27681 },
    { label: 'Delhi',            value: 25883 },
    { label: 'Uttar Pradesh',    value: 17147 },
    { label: 'Maharashtra',      value: 14825 },
    { label: 'Madhya Pradesh',   value: 10904 },
    { label: 'West Bengal',      value: 7822 },
    { label: 'Gujarat',          value: 5299 },
    { label: 'Punjab',           value: 4902 },
    { label: 'Tamil Nadu',       value: 4896 },
  ],
}

const SCHEME_SPLIT = {
  title: 'Batches by scheme',
  unit: 'batches',
  annotation: 'MLP scheme dominates at 95.3%. Fee-Based at 4.7% — small but high-margin segment.',
  data: [
    { label: 'MLP',       value: 562065, color: 'primary' },
    { label: 'Fee Based', value: 27697,  color: 'amber' },
  ],
}

const BATCH_STAGES = {
  title: 'Batch stages',
  unit: 'batches',
  annotation: '87.6% completed, 12.3% ongoing — strong throughput; upcoming pipeline is sparse at 533.',
  data: [
    { label: 'Completed', value: 516533, color: 'emerald' },
    { label: 'Ongoing',   value: 72678,  color: 'amber' },
    { label: 'Upcoming',  value: 533,    color: 'sky' },
  ],
}

const BATCHES_BY_SECTOR = {
  title: 'Sector-wise batch count (top 5)',
  unit: 'batches',
  orient: 'horizontal',
  color: 'violet',
  annotation: 'IT-ITeS runs 4.18 L batches — disproportionately high given sector\'s 39% of enrolment.',
  data: [
    { label: 'IT-ITeS',              value: 418508 },
    { label: 'Tourism & Hospitality',value: 41937 },
    { label: 'Healthcare',           value: 35262 },
    { label: 'Management',           value: 12974 },
    { label: 'BFSI',                 value: 5268 },
  ],
}

const COURSES_BY_BATCH = {
  title: 'Top 14 courses by batch count',
  unit: 'batches',
  orient: 'vertical',
  color: 'emerald',
  annotation: 'CCBP Intensive + CCBP Academy together account for 1.06 L batches — Nxtwave/Entri pipeline.',
  data: [
    { label: 'CCBP Intensive',          value: 62953 },
    { label: 'CCBP Academy',            value: 42838 },
    { label: 'Web Development',         value: 33827 },
    { label: 'Digital Marketing',       value: 20501 },
    { label: 'Programming With Python', value: 17634 },
    { label: 'Advance Excel',           value: 17421 },
    { label: 'Machine Learning',        value: 11486 },
    { label: 'Data Science',            value: 10515 },
    { label: 'Financial Modeling',      value: 8854 },
    { label: 'Business Analytics',      value: 7175 },
    { label: 'AutoCAD',                 value: 6394 },
    { label: 'Ethical Hacking',         value: 6328 },
    { label: 'Data Analyst Bootcamp',   value: 6203 },
    { label: 'AI For Founders',         value: 6042 },
  ],
}

const QUICK_ASKS = [
  'Scholiverse runs 48% of batches — is that real or batch-padding?',
  'Why is Haryana running 53% of all batches?',
  'Ongoing batches > 6 months — risk surface',
  'Upcoming batches sparse at 533 — pipeline-recovery plan',
  'Fee-Based batches outcome vs MLP — comparative ROI',
  'IT-ITeS sector batch concentration — diversify how?',
  'Bottom 10 states by batch count — where to open new centres',
  'CCBP courses — are these scaling responsibly?',
]

export default function BatchesAnalyticsCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · BATCHES"
      title="Batch throughput · 5,89,762 batches"
      subtitle="By TP, by state, by scheme, by sector, by course."
      toneClass="from-amber-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Batches"
      saathiContext="The user is inside the Batches module. Default to batch-level analytics — stuck batches, single-TP concentration, scheme split, sector throughput. For candidate-level drilldowns suggest opening Candidates."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={HEADLINE} />,        prompt: 'Walk me through batch operations — flag the top concentration risk.' },
        { node: <BarChartCard card={BATCHES_BY_TP} />,  prompt: 'Top TPs by batch count — Scholiverse is 48% of national. Audit recommendation.' },
        { node: <BarChartCard card={BATCHES_BY_STATE} />, prompt: 'Top states — why is Haryana 53%? What\'s the policy implication?',     span: 'half' },
        { node: <DonutChartCard card={SCHEME_SPLIT} />, prompt: 'Scheme split MLP vs Fee-Based — comparative outcomes per ₹.',          span: 'half' },
        { node: <DonutChartCard card={BATCH_STAGES} />, prompt: 'Stage breakdown — what should I worry about in the 12.3% ongoing?',    span: 'half' },
        { node: <BarChartCard card={BATCHES_BY_SECTOR} />, prompt: 'Sector batch concentration — IT-ITeS over-indexed. Diversification.', span: 'half' },
        { node: <BarChartCard card={COURSES_BY_BATCH} />, prompt: 'Top courses by batch count — which are growing too fast for quality?' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
