// Training Partners — mirrors NSDC Academy "Training Partners" tab.
// Full TP table (top 25), TPs per state, top sectors by TP count, top
// courses by TP count, top TCs-by-TP. Saathi at the bottom for drilldowns.

import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DonutChartCard from '../../components/cards/DonutChartCard.jsx'
import DataTableCard  from '../../components/cards/DataTableCard.jsx'
import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const HEADLINE = {
  title: 'Training Partner footprint',
  items: [
    { label: 'Training Partners',  value: '587',     tone: 'primary' },
    { label: 'Funded',             value: '385',     tone: 'sky' },
    { label: 'Both',               value: '106',     tone: 'emerald' },
    { label: 'Non-Funded',         value: '96',      tone: 'amber' },
    { label: 'Training Centres',   value: '3,515',   tone: 'indigo' },
    { label: 'Avg TCs / TP',       value: '6',       tone: 'violet' },
  ],
}

const TP_TABLE = {
  title: 'Top 25 Training Partners',
  columns: [
    { key: 'tp',         label: 'Training Partner' },
    { key: 'enrolled',   label: 'Enrolled',  type: 'number' },
    { key: 'trained',    label: 'Trained',   type: 'number' },
    { key: 'assessed',   label: 'Assessed',  type: 'number' },
    { key: 'certified',  label: 'Certified', type: 'number' },
    { key: 'placed',     label: 'Placed',    type: 'number' },
  ],
  rows: [
    { tp: 'Aisect Skill Mission Society',                enrolled: 85672, trained: 85313, assessed: 57862, certified: 57852, placed: 49924 },
    { tp: 'Learnet Skills Limited',                      enrolled: 71008, trained: 65372, assessed: 48714, certified: 37491, placed: 47297 },
    { tp: 'Ethnotech Academic Solutions Pvt Ltd',        enrolled: 55297, trained: 45812, assessed: 44492, certified: 15219, placed: 0 },
    { tp: 'Edubridge Learning Pvt Ltd',                  enrolled: 53793, trained: 45179, assessed: 39767, certified: 36765, placed: 2161 },
    { tp: 'Frankfinn Aviation Services Pvt Ltd',         enrolled: 51080, trained: 48644, assessed: 27416, certified: 23025, placed: 17734 },
    { tp: 'VLCC Limited',                                enrolled: 48916, trained: 39484, assessed: 38179, certified: 38178, placed: 1623 },
    { tp: 'Mahendra Skills Training & Development',      enrolled: 39348, trained: 37905, assessed: 37226, certified: 37285, placed: 9456 },
    { tp: 'Lok Bharti Skilling Solutions (LBSS)',        enrolled: 38708, trained: 39086, assessed: 37947, certified: 37536, placed: 10463 },
    { tp: 'Pratham Education Foundation',                enrolled: 30328, trained: 34260, assessed: 33729, certified: 33709, placed: 24286 },
    { tp: 'Orion Edutech Private Limited',               enrolled: 29403, trained: 23359, assessed: 22672, certified: 22672, placed: 22672 },
    { tp: 'Mann Deshi Foundation',                       enrolled: 27317, trained: 27716, assessed: 26580, certified: 26583, placed: 20404 },
    { tp: 'Aisect Limited',                              enrolled: 26420, trained: 28728, assessed: 28777, certified: 28733, placed: 13112 },
    { tp: 'Gram Tarang Employability Training',          enrolled: 21689, trained: 21675, assessed: 21253, certified: 21479, placed: 14791 },
    { tp: 'Guvi Geek Network Pvt Ltd',                   enrolled: 21375, trained: 21373, assessed: 21276, certified: 10234, placed: 0 },
    { tp: 'IIB Education Private Limited',               enrolled: 20283, trained: 23235, assessed: 11691, certified: 15305, placed: 119 },
    { tp: 'Ganpat University',                           enrolled: 20227, trained: 17358, assessed: 17327, certified: 17171, placed: 0 },
    { tp: 'Orion Educational Society',                   enrolled: 19962, trained: 19077, assessed: 18529, certified: 18374, placed: 13780 },
    { tp: 'Ambuja Foundation',                           enrolled: 15364, trained: 15279, assessed: 13740, certified: 13704, placed: 7173 },
    { tp: 'E-Herex Technologies Pvt Ltd',                enrolled: 14997, trained: 14997, assessed: 14997, certified: 15006, placed: 8592 },
    { tp: 'The George Telegraph Training Institute',     enrolled: 14926, trained: 14454, assessed: 14255, certified: 10547, placed: 3502 },
    { tp: 'Fun First Global Skillers Pvt Ltd',           enrolled: 14264, trained: 13954, assessed: 13874, certified: 13874, placed: 9991 },
    { tp: 'Career Point Institute of Skill Development', enrolled: 13458, trained: 13360, assessed: 13357, certified: 13355, placed: 7331 },
    { tp: 'Samyak IT Solutions Private Limited',         enrolled: 12522, trained: 12177, assessed: 12157, certified: 12157, placed: 5230 },
    { tp: 'Quivan Skill Empowerment Pvt Ltd',            enrolled: 12134, trained: 11394, assessed: 11366, certified: 11375, placed: 6730 },
    { tp: 'Centre for Employment & Educational Guidance',enrolled: 10218, trained: 11322, assessed: 10712, certified: 10736, placed: 2717 },
  ],
  highlight: '4 TPs (Ethnotech, VLCC, IIB Education, Ganpat University) certified 86K candidates between them but placed under 2K — placement-pipeline failure, not training capacity.',
}

const TCS_BY_TP = {
  title: 'Top 10 TPs by training-centre count',
  unit: 'centres',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'Pratham, IIB and Lok Bharti each operate 100+ centres — broadcast amplification through these reaches 1/3 of the network.',
  data: [
    { label: 'Pratham Education Foundation', value: 126 },
    { label: 'IIB Education Private Limited', value: 123 },
    { label: 'Lok Bharti Skilling Solutions', value: 105 },
    { label: 'Indian Centre For Research',    value: 103 },
    { label: 'Don Bosco Tech Society',         value: 96 },
    { label: 'Cadd Centre Training Services',  value: 84 },
    { label: 'VLCC Limited',                   value: 77 },
    { label: 'Centre for Employment Guidance', value: 75 },
  ],
}

const TOP_SECTORS_BY_TP = {
  title: 'Top 10 sectors by TP count',
  unit: 'TPs',
  annotation: 'IT-ITeS leads at 306 TPs — sector diversification needed; only 5 sectors have >100 TPs.',
  data: [
    { label: 'IT-ITeS',               value: 306 },
    { label: 'Apparel',               value: 176 },
    { label: 'Beauty & Wellness',     value: 135 },
    { label: 'Healthcare',            value: 133 },
    { label: 'Electronics',           value: 130 },
    { label: 'BFSI',                  value: 128 },
    { label: 'Tourism & Hospitality', value: 121 },
    { label: 'Management',            value: 119 },
    { label: 'Automotive',            value: 87 },
    { label: 'Construction',          value: 82 },
  ],
}

const COURSES_BY_TP = {
  title: 'Top 6 courses by TP count',
  unit: 'TPs offering',
  orient: 'horizontal',
  color: 'emerald',
  annotation: 'Domestic Data Entry Operator is offered by 112 TPs — saturated; new sectors needed for differentiation.',
  data: [
    { label: 'Domestic Data Entry Operator', value: 112 },
    { label: 'General Duty Assistant',       value: 90 },
    { label: 'Self Employed Tailor',         value: 69 },
    { label: 'Sewing Machine Operator',      value: 64 },
    { label: 'Assistant Beauty Therapist',   value: 43 },
    { label: 'Assistant Electrician',        value: 43 },
  ],
}

const QUICK_ASKS = [
  'Audit VLCC — why is placement rate just 3.3%?',
  'Top 5 TPs by placement count and conversion',
  'Bottom-quartile TPs by Cert→Place ratio',
  'TPs flagged for ghost placements',
  'Which TPs should I send a placement-data broadcast to?',
  'Sector concentration risk by TP — what should we diversify?',
  'TPs in MP that are slipping',
  'Compare Aisect vs Learnet vs Pratham',
]

export default function TrainingPartnersDashboardCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · TRAINING PARTNERS"
      title="Training Partner network · 587 TPs · 3,515 centres"
      subtitle="Detail table of top TPs, footprint, sector + course concentration."
      toneClass="from-sky-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Training Partners"
      saathiContext="The user is inside the Training Partners module. Default to TP-level questions — placement filings, ghost-placement flags, accreditation status, audit candidates. Use the full top-25 TP table baked into your system prompt and the placement-rate flags."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={HEADLINE} /> ,         prompt: 'Walk me through the TP network footprint and any concentration risks.' },
        { node: <DataTableCard card={TP_TABLE} />,        prompt: 'Walk me through the top 25 TPs. Identify the bottom quartile by certification-to-placement conversion and recommend actions.' },
        { node: <BarChartCard card={TCS_BY_TP} />,        prompt: 'Top 10 TPs by centre count — which give us the most broadcast amplification?',  span: 'half' },
        { node: <DonutChartCard card={TOP_SECTORS_BY_TP} />, prompt: 'Top sectors by TP count — where is concentration too high?',                  span: 'half' },
        { node: <BarChartCard card={COURSES_BY_TP} />,    prompt: 'Top courses by TP count — which are saturated? What should we diversify into?' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
