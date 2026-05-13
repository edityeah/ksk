// Sectors — mirrors NSDC Academy "Sectors" tab.
// 32-sector E/T/A/C drill table + sector-wise TP count + sector-wise TC count.

import KpiGridCard    from '../../components/cards/KpiGridCard.jsx'
import BarChartCard   from '../../components/cards/BarChartCard.jsx'
import DataTableCard  from '../../components/cards/DataTableCard.jsx'
import AnalystCanvasShell from './_AnalystCanvasShell.jsx'

const HEADLINE = {
  title: 'Sector landscape · 37 active sectors',
  items: [
    { label: 'Active sectors',  value: '37',         tone: 'primary' },
    { label: 'Total Enrolled',  value: '27,74,408',  tone: 'sky' },
    { label: 'Total Trained',   value: '23,65,851',  tone: 'emerald' },
    { label: 'Total Assessed',  value: '20,06,118',  tone: 'violet' },
    { label: 'Total Certified', value: '13,80,856',  tone: 'amber' },
  ],
}

const SECTOR_TABLE = {
  title: 'Sector E / T / A / C drill (top 25)',
  columns: [
    { key: 'sector',    label: 'Sector' },
    { key: 'enrolled',  label: 'Enrolled',  type: 'number' },
    { key: 'trained',   label: 'Trained',   type: 'number' },
    { key: 'assessed',  label: 'Assessed',  type: 'number' },
    { key: 'certified', label: 'Certified', type: 'number' },
  ],
  rows: [
    { sector: 'IT-ITeS',               enrolled: 1078431, trained: 740849, assessed: 666051, certified: 354771 },
    { sector: 'Management',            enrolled: 250116,  trained: 202748, assessed: 179555, certified: 93843 },
    { sector: 'BFSI',                  enrolled: 249913,  trained: 216106, assessed: 185194, certified: 144683 },
    { sector: 'Tourism & Hospitality', enrolled: 155655,  trained: 150838, assessed: 120468, certified: 111197 },
    { sector: 'Healthcare',            enrolled: 147037,  trained: 167553, assessed: 101432, certified: 93913 },
    { sector: 'Beauty & Wellness',     enrolled: 136895,  trained: 128375, assessed: 109043, certified: 90258 },
    { sector: 'Electronics',           enrolled: 109643,  trained: 109246, assessed: 95723,  certified: 67409 },
    { sector: 'Apparel',               enrolled: 96433,   trained: 99944,  assessed: 79165,  certified: 78951 },
    { sector: 'Automotive',            enrolled: 84093,   trained: 84526,  assessed: 70338,  certified: 60941 },
    { sector: 'Construction',          enrolled: 72646,   trained: 74578,  assessed: 66855,  certified: 50857 },
    { sector: 'Domestic Workers',      enrolled: 59445,   trained: 59567,  assessed: 59548,  certified: 2768 },
    { sector: 'Retail',                enrolled: 52068,   trained: 49131,  assessed: 38794,  certified: 36088 },
    { sector: 'Agriculture',           enrolled: 48472,   trained: 49866,  assessed: 43601,  certified: 42801 },
    { sector: 'Logistics',             enrolled: 35610,   trained: 35111,  assessed: 24095,  certified: 20921 },
    { sector: 'Media & Entertainment', enrolled: 34622,   trained: 26637,  assessed: 22469,  certified: 20529 },
    { sector: 'Capital Goods',         enrolled: 25529,   trained: 26667,  assessed: 19082,  certified: 18482 },
    { sector: 'Telecom',               enrolled: 20512,   trained: 20796,  assessed: 15832,  certified: 15484 },
    { sector: 'Food Processing',       enrolled: 15392,   trained: 15298,  assessed: 14195,  certified: 14184 },
    { sector: 'Sports',                enrolled: 15127,   trained: 20450,  assessed: 11847,  certified: 11793 },
    { sector: 'Furniture & Fittings',  enrolled: 12687,   trained: 12291,  assessed: 11476,  certified: 6677 },
    { sector: 'Plumbing',              enrolled: 11799,   trained: 13013,  assessed: 12522,  certified: 7820 },
    { sector: 'Green Jobs',            enrolled: 10792,   trained: 10447,  assessed: 9895,   certified: 9410 },
    { sector: 'Power',                 enrolled: 7690,    trained: 8672,   assessed: 7665,   certified: 7505 },
    { sector: 'Aerospace & Aviation',  enrolled: 5967,    trained: 5915,   assessed: 5373,   certified: 5305 },
    { sector: 'Hydrocarbon',           enrolled: 4075,    trained: 4121,   assessed: 3973,   certified: 3651 },
  ],
  highlight: 'Domestic Workers: 59,548 assessed but only 2,768 certified (4.6%) — certification-pipeline failure or NOS gap. IT-ITeS: 666K assessed → 355K certified (53%) — significant attrition at certification stage too.',
}

const TPS_PER_SECTOR = {
  title: 'TPs per sector (top 15)',
  unit: 'TPs',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'IT-ITeS has 306 TPs; bottom-20 sectors have fewer than 10 TPs each — sector-density gap.',
  data: [
    { label: 'IT-ITeS',                value: 306 },
    { label: 'Apparel',                value: 176 },
    { label: 'Beauty & Wellness',      value: 135 },
    { label: 'Healthcare',             value: 133 },
    { label: 'Electronics',            value: 130 },
    { label: 'BFSI',                   value: 128 },
    { label: 'Tourism & Hospitality',  value: 121 },
    { label: 'Management',             value: 119 },
    { label: 'Automotive',             value: 87 },
    { label: 'Construction',           value: 82 },
    { label: 'Media & Entertainment',  value: 77 },
    { label: 'Retail',                 value: 71 },
    { label: 'Logistics',              value: 54 },
    { label: 'Telecom',                value: 39 },
    { label: 'Capital Goods',          value: 38 },
  ],
}

const TCS_PER_SECTOR = {
  title: 'TCs per sector (top 15)',
  unit: 'centres',
  orient: 'horizontal',
  color: 'emerald',
  annotation: 'IT-ITeS again at 2.06 L centres. Healthcare a strong second at 1.37 L — care-economy investment paying off.',
  data: [
    { label: 'IT-ITeS',                value: 205610 },
    { label: 'Healthcare',             value: 137919 },
    { label: 'BFSI',                   value: 92929 },
    { label: 'Tourism & Hospitality',  value: 71665 },
    { label: 'Apparel',                value: 66783 },
    { label: 'Management',             value: 61980 },
    { label: 'Electronics',            value: 51542 },
    { label: 'Automotive',             value: 50663 },
    { label: 'Beauty & Wellness',      value: 41496 },
    { label: 'Retail',                 value: 35154 },
    { label: 'Agriculture',            value: 32435 },
    { label: 'Construction',           value: 18359 },
    { label: 'Logistics',              value: 17642 },
    { label: 'Telecom',                value: 14823 },
    { label: 'Media & Entertainment',  value: 12552 },
  ],
}

const QUICK_ASKS = [
  'Domestic Workers — 95% drop from assessed to certified. Why?',
  'IT-ITeS cert rate 53% — what\'s the leak?',
  'Bottom-20 sectors by TP density — diversification plan',
  'Apparel has 176 TPs but 99K trained — supply-demand mismatch?',
  'Sector with strongest cert-to-place pipeline',
  'Healthcare 137K TCs — over-investment or under-utilisation?',
  'Compare BFSI vs Tourism vs Healthcare on full funnel',
  'Sectors growing >50% YoY — capacity plan',
]

export default function SectorsAnalyticsCanvas({ context }) {
  return (
    <AnalystCanvasShell
      eyebrow="NSDC ACADEMY · SECTORS"
      title="37 active sectors · the structural map"
      subtitle="Per-sector E/T/A/C drill + TP/TC density."
      toneClass="from-emerald-100/60 via-white to-white"
      refreshedOn="06/05/2026"
      dataMartOn="02/05/2026"
      saathiTitle="Saathi · Sectors"
      saathiContext="The user is inside the Sectors module. Default to sector-level pipeline questions — cert leakage, TP/TC density, NOS gaps, sector-wise placement. For TP-specific drilldowns suggest opening Training Partners."
      threadId={context?.threadId}
      cells={[
        { node: <KpiGridCard card={HEADLINE} />,        prompt: 'Walk me through the sector landscape and surface the biggest structural gap.' },
        { node: <DataTableCard card={SECTOR_TABLE} />,  prompt: 'Walk me through the 25-sector E/T/A/C table. Flag the worst certification-leakage sectors.' },
        { node: <BarChartCard card={TPS_PER_SECTOR} />, prompt: 'TPs per sector — what\'s the diversification ask for the bottom-20 sectors?', span: 'half' },
        { node: <BarChartCard card={TCS_PER_SECTOR} />, prompt: 'TCs per sector — is Healthcare 1.37L over-built? Compare utilisation.',        span: 'half' },
      ]}
      quickAsks={QUICK_ASKS}
    />
  )
}
