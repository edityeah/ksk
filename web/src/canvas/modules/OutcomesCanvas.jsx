// Outcomes (Value Add On) — mirrors NSDC Academy "Value Add On" tab.
// Mode of assessment, trained-vs-placed by sector, women trained-vs-placed,
// top-courses treemap (as KPI tiles), age-group × course matrix.

import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard  from '../../components/cards/DataTableCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const MODE_OF_ASSESSMENT = {
  title: 'Mode of assessment',
  unit: 'candidates',
  annotation: 'Self-certified at 22.3 L = 81% of all assessments. SSC-Certified only 1.07 L (3.9%) — credentialing gap.',
  data: [
    { label: 'Self-Certified',     value: 2231357, color: 'amber' },
    { label: 'Third-Party',        value: 287716,  color: 'primary' },
    { label: 'SSC-Certified',      value: 106946,  color: 'emerald' },
  ],
}

const WOMEN_FUNNEL = {
  title: 'Women candidates · trained vs placed',
  items: [
    { label: 'Women Trained', value: '10,57,336', tone: 'fuchsia' },
    { label: 'Women Placed',  value: '2,89,854',  delta: '27.4% conversion', tone: 'rose' },
    { label: 'Total Trained', value: '23,65,851', tone: 'sky' },
    { label: 'Total Placed',  value: '6,54,076',  delta: '23.6% conversion', tone: 'primary' },
  ],
}

const TRAINED_VS_PLACED_BY_SECTOR = {
  title: 'Trained → Placed by sector',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'IT-ITeS: 740K trained → 115K placed (15.6%). BFSI: 216K → 87K (40.6%). BFSI 2.6× better at converting.',
  data: [
    { label: 'IT-ITeS · Trained',     value: 740849 },
    { label: 'IT-ITeS · Placed',      value: 115591 },
    { label: 'BFSI · Trained',        value: 216106 },
    { label: 'BFSI · Placed',         value: 87768 },
    { label: 'Management · Trained',  value: 202748 },
    { label: 'Management · Placed',   value: 57774 },
    { label: 'Healthcare · Trained',  value: 167553 },
    { label: 'Healthcare · Placed',   value: 41890 },
    { label: 'Tourism · Trained',     value: 150838 },
    { label: 'Tourism · Placed',      value: 70457 },
    { label: 'Beauty · Trained',      value: 128375 },
    { label: 'Beauty · Placed',       value: 23446 },
    { label: 'Electronics · Trained', value: 109246 },
    { label: 'Electronics · Placed',  value: 33754 },
  ],
}

const AGE_COURSE_MATRIX = {
  title: 'Course × age group enrollment',
  columns: [
    { key: 'course',  label: 'Course' },
    { key: 'a17',     label: '13-17',         type: 'number' },
    { key: 'a39',     label: '18-39',         type: 'number' },
    { key: 'a59',     label: '40-59',         type: 'number' },
    { key: 'a60',     label: '60+',           type: 'number' },
  ],
  rows: [
    { course: 'Domestic Data Entry Operator',  a17: 15258, a39: 78162, a59: 1515,  a60: 43 },
    { course: 'CCBP Intensive',                a17: 557,   a39: 61443, a59: 419,   a60: 4 },
    { course: 'Gen AI Foundation Certificate', a17: 942,   a39: 47762, a59: 13176, a60: 272 },
    { course: 'General Housekeeper',           a17: 5,     a39: 54178, a59: 2261,  a60: 27 },
    { course: 'General Duty Assistant',        a17: 1193,  a39: 44357, a59: 775,   a60: 42 },
    { course: 'Hindi Se English Seekho',       a17: 1289,  a39: 39160, a59: 4380,  a60: 412 },
    { course: 'CCBP Academy',                  a17: 1061,  a39: 41212, a59: 11,    a60: 3 },
    { course: 'Self Employed Tailor',          a17: 1323,  a39: 30283, a59: 2396,  a60: 37 },
    { course: 'Web Development',               a17: 310,   a39: 33280, a59: 134,   a60: 9 },
    { course: 'Retail Sales Associate',        a17: 236,   a39: 24265, a59: 599,   a60: 11 },
    { course: 'Covid Health Workers',          a17: 0,     a39: 22037, a59: 2183,  a60: 45 },
    { course: 'Digital Marketing',             a17: 612,   a39: 22430, a59: 506,   a60: 125 },
    { course: 'Sewing Machine Operator',       a17: 863,   a39: 20978, a59: 1596,  a60: 75 },
    { course: 'Agri. Extension Service Prov.', a17: 35,    a39: 12598, a59: 10477, a60: 291 },
    { course: 'Beauty Therapist',              a17: 3498,  a39: 17480, a59: 1910,  a60: 255 },
    { course: 'Assistant Beauty Therapist',    a17: 4958,  a39: 16755, a59: 630,   a60: 6 },
    { course: 'Air Conditioner Repair Service',a17: 2,     a39: 20809, a59: 922,   a60: 261 },
    { course: 'Business Correspondent',        a17: 51,    a39: 21356, a59: 67,    a60: 0 },
  ],
  highlight: 'Gen AI Foundation has 13K learners aged 40-59 — strongest mid-career upskilling course. Hindi Se English Seekho similar at 4.4K. Agri Extension has 10K in 40-59 — RPL formalisation opportunity.',
}

const HEADLINE = {
  title: 'Outcomes · the bottom line',
  items: [
    { label: 'Total Placed',       value: '6,54,076',  delta: '23.6% from trained', tone: 'emerald' },
    { label: 'Women Placed',       value: '2,89,854',  delta: '27.4% from trained', tone: 'fuchsia' },
    { label: 'SSC-Certified',      value: '1,06,946',  tone: 'primary' },
    { label: 'Third-Party Cert.',  value: '2,87,716',  tone: 'sky' },
    { label: 'Self-Certified',     value: '22,31,357', delta: 'data-quality flag',  tone: 'amber' },
    { label: 'BFSI conversion',    value: '40.6%',     delta: 'top performer',      tone: 'emerald' },
  ],
}

const QUICK_ASKS = [
  'Self-Certified is 81% of assessments — credentialing fix proposal',
  'BFSI converts 40.6% trained → placed. Why so much better than IT-ITeS at 15.6%?',
  'Women placement gap by sector — top 3 to fix',
  'Mid-career (40-59) RPL opportunity — top 5 courses',
  'Beauty & Wellness placement rate is 18.3% — what\'s blocking?',
  'Sector with best trained-to-placed compounding',
  'Compare SSC-Certified vs Third-Party vs Self conversion-to-placement',
  '13-17 cohort enrolment is 93K — apprenticeship pipeline view',
]

export default function OutcomesCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · VALUE ADD ON / OUTCOMES"
      title="Outcomes · trained vs placed, women funnel, assessment quality"
      subtitle="What's working, what isn't, where the data-quality flags sit."
      toneClass="from-fuchsia-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Outcomes"
      saathiContext="The user is inside the Outcomes (Value Add On) module. Default to placement-conversion, gender, certification-quality and age-group questions. Surface data-quality flags (Self-Certified = 81%) prominently."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={HEADLINE} />,                  prompt: 'Walk me through outcomes and flag the biggest data-quality gap.' },
        { node: <DonutChartCard card={MODE_OF_ASSESSMENT} />,     prompt: 'Self-Certified is 81% of assessments. Recommend a credentialing fix and action panel.',  span: 'half' },
        { node: <KpiGridCard card={WOMEN_FUNNEL} />,              prompt: 'Women placement is 27.4% (4 pp better than overall). Where are women still under-converted?', span: 'half' },
        { node: <BarChartCard card={TRAINED_VS_PLACED_BY_SECTOR} />, prompt: 'Trained vs placed by sector — sort by conversion rate, flag bottom 3.' },
        { node: <DataTableCard card={AGE_COURSE_MATRIX} />,       prompt: 'Course × age matrix — surface the strongest mid-career (40-59) upskilling courses.' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
