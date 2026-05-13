// Candidates — mirrors NSDC Academy "Candidates" tab.
// Demographic + drill breakdowns: gender, age, category, by state, by sector,
// by top TPs, by courses. Saathi handles drilldowns.

import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const HEADLINE = {
  title: 'Candidate base · 27.74 L enrolled',
  items: [
    { label: 'Total Enrolled', value: '27,74,408', tone: 'primary' },
    { label: 'Male',           value: '15,37,846', tone: 'sky' },
    { label: 'Female',         value: '12,01,797', tone: 'fuchsia' },
    { label: 'Transgender',    value: '199',       tone: 'violet' },
    { label: 'States covered', value: '36',        tone: 'emerald' },
    { label: 'Districts',      value: '~700',      tone: 'amber' },
  ],
}

const BY_GENDER = {
  title: 'Enrolled by Gender',
  unit: 'candidates',
  annotation: 'Female enrolment at 43.3% — 6 pp below the national workforce target of 50%.',
  data: [
    { label: 'Male',        value: 1537846, color: 'primary' },
    { label: 'Female',      value: 1201797, color: 'fuchsia' },
    { label: 'Transgender', value: 199,     color: 'violet' },
  ],
}

const BY_AGE = {
  title: 'Enrolled by Age Group',
  unit: 'candidates',
  orient: 'vertical',
  color: 'sky',
  annotation: 'Working-age 18-39 dominates at 24.7 L (89%). 40-59 cohort is 1.67 L — RPL opportunity.',
  data: [
    { label: '1-12',          value: 8367 },
    { label: '13-17',         value: 93455 },
    { label: '18-39',         value: 2472447 },
    { label: '40-59',         value: 166867 },
    { label: '60 and older',  value: 33272 },
  ],
}

const BY_CATEGORY = {
  title: 'Enrolled by Social Category',
  unit: 'candidates',
  annotation: 'Not-disclosed dominates at 47% — data-quality issue; need TP nudge to complete category fields.',
  data: [
    { label: 'Not Disclosed', value: 1292254, color: 'amber' },
    { label: 'OBC',           value: 640925,  color: 'primary' },
    { label: 'Gen',           value: 535913,  color: 'sky' },
    { label: 'SC',            value: 203904,  color: 'emerald' },
    { label: 'ST',            value: 101411,  color: 'violet' },
  ],
}

const BY_STATE = {
  title: 'Top 8 states by enrolled',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'MP, Maharashtra, WB account for >50% of enrolment among top states — geographic concentration is high.',
  data: [
    { label: 'Madhya Pradesh', value: 180168 },
    { label: 'Maharashtra',    value: 146887 },
    { label: 'West Bengal',    value: 109438 },
    { label: 'Karnataka',      value: 89000 },
    { label: 'Tamil Nadu',     value: 78000 },
    { label: 'Uttar Pradesh',  value: 76000 },
    { label: 'Gujarat',        value: 64000 },
    { label: 'Bihar',          value: 52000 },
  ],
}

const TOP_TPS_BY_ENROLLED = {
  title: 'Top 5 TPs by enrolled',
  unit: 'candidates',
  annotation: 'Scholiverse Educare leads at 2.87 L enrolled — heavy reliance on one TP.',
  data: [
    { label: 'Scholiverse Educare',    value: 287318 },
    { label: 'Urban Company Limited',  value: 126246 },
    { label: 'Entri Software',         value: 109036 },
    { label: 'Nxtwave Disruptive Tech',value: 108900 },
    { label: 'Aisect Skill Mission',   value: 85672 },
  ],
}

const BY_SECTOR = {
  title: 'Enrolled by Sector (top 7)',
  unit: 'candidates',
  orient: 'vertical',
  color: 'emerald',
  annotation: 'IT-ITeS at 10.78 L dwarfs all others. Beyond top 7, no sector crosses 75 K.',
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

const BY_COURSES = {
  title: 'Top 10 courses by enrolled',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'Entry-tier digital + care-economy roles dominate — DDEO leads at 84K (filtered view).',
  data: [
    { label: 'Domestic Data Entry Operator',  value: 84408 },
    { label: 'General Duty Assistant',        value: 44016 },
    { label: 'Hindi Se English Seekho',       value: 32446 },
    { label: 'Self Employed Tailor',          value: 30446 },
    { label: 'Covid Health Workers',          value: 24269 },
    { label: 'Agri. Extension Service Prov.', value: 23401 },
    { label: 'Retail Sales Associate',        value: 22011 },
    { label: 'Assistant Beauty Therapist',    value: 21959 },
    { label: 'Business Correspondent',        value: 20969 },
    { label: 'Sewing Machine Operator',       value: 20562 },
  ],
}

const QUICK_ASKS = [
  'Why is Not-Disclosed category so high? Data-quality fix?',
  'Female enrolment vs placement — which sectors are blocking?',
  'Show me 40-59 RPL opportunity by sector',
  'Compare MP / Maharashtra / WB enrolment vs placement',
  'Which districts in MP need a TP push?',
  'Scholiverse Educare 2.87L — is that real enrolment or batch-padding?',
  'IT-ITeS over-concentration — diversify how?',
  'Bottom 10 states by enrolment — where do we open new centres?',
]

export default function CandidatesAnalyticsCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · CANDIDATES"
      title="27,74,408 candidates · the funnel starts here"
      subtitle="Drill by gender, age, category, state, sector, TP, course."
      toneClass="from-violet-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Candidates"
      saathiContext="The user is inside the Candidates module. Default to candidate-level questions — demographics, drop-outs, state/district drilldowns, course choice patterns. For TP-level questions suggest opening Training Partners."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={HEADLINE} />,       prompt: 'Walk me through the candidate footprint and any demographic gaps.' },
        { node: <DonutChartCard card={BY_GENDER} />,   prompt: 'Female enrolment is 43.3% — by sector, where are women under-represented?',  span: 'half' },
        { node: <BarChartCard card={BY_AGE} />,        prompt: 'Age breakdown — where is the 40-59 RPL opportunity strongest?',              span: 'half' },
        { node: <DonutChartCard card={BY_CATEGORY} />, prompt: 'Not-disclosed is 47% — propose a TP-side data-quality fix and broadcast.',   span: 'half' },
        { node: <BarChartCard card={BY_STATE} />,      prompt: 'Top states by enrolment — flag any where TPs are slipping vs prior year.',   span: 'half' },
        { node: <DonutChartCard card={TOP_TPS_BY_ENROLLED} />, prompt: 'Top 5 TPs by enrolment — audit Scholiverse Educare\'s 2.87L number.', span: 'half' },
        { node: <BarChartCard card={BY_SECTOR} />,     prompt: 'Sector mix — diversification plan beyond IT-ITeS.',                          span: 'half' },
        { node: <BarChartCard card={BY_COURSES} />,    prompt: 'Top 10 courses for candidates — which are slipping in placement?' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
