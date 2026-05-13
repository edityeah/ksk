// Enrollments — mirrors NSDC Academy "Candidates" tab, but the entry-point
// concept is now ENROLLMENTS (candidates IS the enrollment record). Adds a
// scheme filter at the top so the NSDC officer can scope to PMKVY / DDU-GKY /
// NAPS / PM Vishwakarma / SIB / RPL / etc.

import { useState } from 'react'
import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'
import SchemeFilterBar, { schemeLabel } from '../../components/SchemeFilterBar.jsx'
import { SCHEME_ENROLLMENT } from './_schemeData.js'

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

// Build a per-scheme HEADLINE card on the fly.
function headlineForScheme(scheme) {
  const d = SCHEME_ENROLLMENT[scheme] || SCHEME_ENROLLMENT.all
  return {
    title: `Enrollment funnel · ${schemeLabel(scheme)}`,
    items: [
      { label: 'Enrolled',  value: d.enrolled.toLocaleString('en-IN'),  tone: 'primary' },
      { label: 'Trained',   value: d.trained.toLocaleString('en-IN'),   tone: 'sky' },
      { label: 'Certified', value: d.certified.toLocaleString('en-IN'), tone: 'emerald' },
      { label: 'Placed',    value: d.placed.toLocaleString('en-IN'),    tone: 'amber',
        delta: `${Math.round((d.placed / Math.max(d.trained, 1)) * 100)}% from trained` },
    ],
  }
}

export default function CandidatesAnalyticsCanvas({ context }) {
  const [scheme, setScheme] = useState('all')
  const schemeHeadline = headlineForScheme(scheme)
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · ENROLLMENTS"
      title={`Enrollments · ${schemeLabel(scheme)}`}
      subtitle="Scoped by scheme. Drill by gender, age, category, state, sector, TP, course."
      toneClass="from-violet-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Enrollments"
      saathiContext={`The user is inside the Enrollments module. Active scheme: ${schemeLabel(scheme)}. Scope every analytical answer to this scheme — quote the scheme name in your opening sentence. For TP-level drilldowns suggest opening Training Partners; for placement drilldowns suggest Placement.`}
      threadId={context?.threadId}
      filterSlot={<SchemeFilterBar value={scheme} onChange={setScheme} />}
      cells={[
        { node: <KpiGridCard card={schemeHeadline} />, prompt: `Walk me through the ${schemeLabel(scheme)} enrolment funnel and flag the biggest leak.` },
        { node: <KpiGridCard card={HEADLINE} />,       prompt: 'Walk me through the all-scheme candidate footprint and any demographic gaps.' },
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
