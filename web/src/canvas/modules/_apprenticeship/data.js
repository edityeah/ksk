// NAPS (National Apprenticeship Promotion Scheme) data fixtures.
// All numbers extracted verbatim from the NSDC Apprenticeship Power BI
// dashboard PDFs (as of 22/04/2025). Used by every tab in
// ApprenticeshipsCanvas + injected into Saathi's system prompt so the agent
// can quote them.
//
// Filters in the UI are "soft" against this static fixture — they change
// what Saathi answers, but the displayed charts here are the headline
// pan-India numbers. When real data wiring lands, swap these fixtures for
// a server call.

// ── HEADLINE KPIs ────────────────────────────────────────────────────────
export const OVERVIEW_KPIS = {
  title: 'NAPS · National snapshot (as of 22/04/2025)',
  items: [
    { label: 'Apprentices Engaged',       value: '51,38,125', tone: 'primary' },
    { label: 'Completed Training',        value: '26,39,961', tone: 'sky' },
    { label: 'Apprentices Ongoing',       value: '9,72,489',  tone: 'violet' },
    { label: 'Apprentices Certified',     value: '7,49,442',  tone: 'emerald' },
    { label: 'Active Establishments',     value: '36,366',    tone: 'amber' },
    { label: 'Registered Establishments', value: '1,15,368',  tone: 'rose' },
    { label: 'DBT Paid',                  value: '₹775.94 Cr', delta: 'as of 22/04/2025', tone: 'indigo' },
  ],
}

// ── ENGAGEMENT TREND (Overview + Analytics) ──────────────────────────────
export const ENGAGEMENT_TREND = {
  title: 'Apprentice engagement · FY-18-19 to FY-26-27',
  xAxis: 'Financial Year', yAxis: 'Apprentices',
  annotation: 'FY-25-26 peaked at 12.3 L engaged. FY-26-27 just started — projections show ~14 L if trajectory holds.',
  series: [
    { name: 'Engaged',            color: 'primary', data: [
      { x: 'FY-18-19', y: 35334  }, { x: 'FY-19-20', y: 206800 }, { x: 'FY-20-21', y: 307780 },
      { x: 'FY-21-22', y: 590211 }, { x: 'FY-22-23', y: 738546 }, { x: 'FY-23-24', y: 932370 },
      { x: 'FY-24-25', y: 985039 }, { x: 'FY-25-26', y: 1233831 }, { x: 'FY-26-27', y: 108214 },
    ]},
    { name: 'Completed Training', color: 'emerald', data: [
      { x: 'FY-18-19', y: 18000  }, { x: 'FY-19-20', y: 105000 }, { x: 'FY-20-21', y: 165000 },
      { x: 'FY-21-22', y: 320000 }, { x: 'FY-22-23', y: 410000 }, { x: 'FY-23-24', y: 550000 },
      { x: 'FY-24-25', y: 590000 }, { x: 'FY-25-26', y: 620000 }, { x: 'FY-26-27', y: 62000  },
    ]},
    { name: 'Dropouts',           color: 'rose',    data: [
      { x: 'FY-18-19', y: 4000   }, { x: 'FY-19-20', y: 28000  }, { x: 'FY-20-21', y: 48000  },
      { x: 'FY-21-22', y: 95000  }, { x: 'FY-22-23', y: 120000 }, { x: 'FY-23-24', y: 145000 },
      { x: 'FY-24-25', y: 158000 }, { x: 'FY-25-26', y: 175000 }, { x: 'FY-26-27', y: 19000  },
    ]},
  ],
}

// ── TOP 10 ENROLLED COURSES (Overview) ───────────────────────────────────
export const TOP_COURSES = {
  title: 'Top 10 enrolled courses · all India',
  unit: 'apprentices',
  orient: 'vertical',
  color: 'primary',
  annotation: 'Electrician + Fitter dominate at >300K each — over half of top-10 are core trade roles.',
  data: [
    { label: 'Electrician',                   value: 308668 },
    { label: 'Fitter',                        value: 295648 },
    { label: 'Automotive Assembly Operator',  value: 209373 },
    { label: 'Automotive Assembly Technician',value: 135219 },
    { label: 'Assembly Line Operator',        value: 101648 },
    { label: 'Customer Care Exec Domestic',   value: 89607 },
    { label: 'Computer Operator + Prog.',     value: 64389 },
    { label: 'Retail Trainee Associate',      value: 62655 },
    { label: 'Welder (Gas + Electric)',       value: 53695 },
    { label: 'Assembly Line Operator V3',     value: 50816 },
  ],
}

// ── STATE RANKING (Overview) ──────────────────────────────────────────────
export const STATE_RANKING = {
  title: 'Apprentices engaged · top 14 states',
  unit: 'apprentices',
  orient: 'horizontal',
  color: 'sky',
  annotation: 'Maharashtra leads with 13.1 L apprentices. Top-3 (Maha, Gujarat, Tamil Nadu) account for 36% of national engagement.',
  data: [
    { label: 'Maharashtra',     value: 1313341 },
    { label: 'Gujarat',         value: 551693 },
    { label: 'Tamil Nadu',      value: 520988 },
    { label: 'Karnataka',       value: 431841 },
    { label: 'Uttar Pradesh',   value: 395859 },
    { label: 'Haryana',         value: 385170 },
    { label: 'Telangana',       value: 220506 },
    { label: 'West Bengal',     value: 151971 },
    { label: 'Madhya Pradesh',  value: 143194 },
    { label: 'Delhi',           value: 129235 },
    { label: 'Andhra Pradesh',  value: 113322 },
    { label: 'Uttarakhand',     value: 111209 },
    { label: 'Rajasthan',       value: 111179 },
    { label: 'Punjab',          value: 92637 },
  ],
}

// ── ENGAGEMENT BY GENDER (Overview + TPA) ────────────────────────────────
export const GENDER_DONUT = {
  title: 'Engagement by gender',
  unit: 'apprentices',
  annotation: 'Female participation at 22% — 6 pp below national workforce target.',
  data: [
    { label: 'Male',              value: 4006837, color: 'primary' },
    { label: 'Female',            value: 1131198, color: 'fuchsia' },
    { label: 'Data Not Available',value: 51,      color: 'sky' },
    { label: 'Transgender',       value: 39,      color: 'violet' },
  ],
}

// ── SOCIAL CATEGORY (Overview + Analytics) ───────────────────────────────
export const SOCIAL_CATEGORY = {
  title: 'Engagement by social category',
  unit: 'apprentices',
  annotation: 'General + OBC = 64%. SC + ST = 13% (below 22% population share — reservation gap).',
  data: [
    { label: 'General',           value: 2048728, color: 'primary' },
    { label: 'OBC',               value: 1264095, color: 'emerald' },
    { label: 'SC',                value: 494670,  color: 'amber' },
    { label: 'ST',                value: 186703,  color: 'violet' },
    { label: 'Data Not Available',value: 10793,   color: 'sky' },
    { label: 'Minority',          value: 1843,    color: 'rose' },
  ],
}

// ── QUALIFICATION (Overview) ─────────────────────────────────────────────
export const QUALIFICATION_BREAKDOWN = {
  title: 'Engagement by qualification',
  unit: 'apprentices',
  orient: 'horizontal',
  color: 'sky',
  annotation: 'ITI + 10th together account for 50% — vocational and lower-secondary pipelines dominate.',
  data: [
    { label: 'ITI',           value: 1280406 },
    { label: '10th',          value: 1202791 },
    { label: '12th',          value: 855730 },
    { label: 'Diploma',       value: 322828 },
    { label: 'Graduate',      value: 651766 },
    { label: 'Post Graduate', value: 65958 },
    { label: '11th',          value: 220342 },
    { label: 'Below Metric',  value: 82098 },
    { label: 'Others',        value: 25118 },
  ],
}

// ── TOP SECTORS (Overview + Sector) ──────────────────────────────────────
export const TOP_SECTORS = {
  title: 'Top 10 sectors by apprentice engagement',
  unit: 'apprentices',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'Automotive dominates at 10.3 L (~20% of national). IT-ITeS second at 4.96 L.',
  data: [
    { label: 'Automotive',               value: 1031147 },
    { label: 'IT-ITeS',                  value: 496334 },
    { label: 'Electronics',              value: 438834 },
    { label: 'Retail',                   value: 409578 },
    { label: 'Production & Manufacturing',value: 295705 },
    { label: 'Electrical (incl. Renew.)',value: 290641 },
    { label: 'Tourism & Hospitality',    value: 165815 },
    { label: 'BFSI',                     value: 157955 },
    { label: 'Power',                    value: 145228 },
    { label: 'Telecom',                  value: 143518 },
  ],
}

// ── ESTABLISHMENT TAB ────────────────────────────────────────────────────
export const ESTAB_KPIS = {
  title: 'Establishment footprint',
  items: [
    { label: 'Registered (FY)',     value: '1,15,368', tone: 'primary' },
    { label: 'Active (FY)',         value: '29,738',   tone: 'emerald' },
    { label: 'Apprentices Engaged', value: '51,29,800', tone: 'sky' },
    { label: 'Active Opportunities',value: '5,01,542', tone: 'violet' },
    { label: 'Live Vacancies',      value: '6,33,958', tone: 'amber' },
  ],
}

export const ESTAB_TREND = {
  title: 'Establishments registered + active · FY-18-19 → 22-23',
  xAxis: 'Financial Year', yAxis: 'Establishments',
  annotation: 'Registered base grew 4× from 28K to 115K. Active growth slower — active/registered ratio dropped from 42% to 32%.',
  series: [
    { name: 'Registered', color: 'primary', data: [
      { x: 'FY-18-19', y: 28241 }, { x: 'FY-19-20', y: 52573 }, { x: 'FY-20-21', y: 64389 },
      { x: 'FY-21-22', y: 94496 }, { x: 'FY-22-23', y: 109518 },
    ]},
    { name: 'Active',     color: 'emerald', data: [
      { x: 'FY-18-19', y: 11874 }, { x: 'FY-19-20', y: 17446 }, { x: 'FY-20-21', y: 28241 },
      { x: 'FY-21-22', y: 34283 }, { x: 'FY-22-23', y: 36366 },
    ]},
  ],
}

export const ESTAB_GEOGRAPHY = {
  title: 'Establishments · top 10 states',
  unit: 'establishments',
  orient: 'vertical',
  color: 'primary',
  annotation: 'Maharashtra runs ~14K registered establishments — same state-concentration we see across NAPS.',
  data: [
    { label: 'Maharashtra',    value: 14200 },
    { label: 'Uttar Pradesh',  value: 11900 },
    { label: 'Gujarat',        value: 11400 },
    { label: 'Haryana',        value: 8700  },
    { label: 'Tamil Nadu',     value: 8200  },
    { label: 'Karnataka',      value: 7600  },
    { label: 'Madhya Pradesh', value: 6800  },
    { label: 'Andhra Pradesh', value: 6400  },
    { label: 'Telangana',      value: 5900  },
    { label: 'Kerala',         value: 4200  },
  ],
}

export const ESTAB_CATEGORY = {
  title: 'Registered establishments · by size',
  unit: 'share',
  annotation: 'Small + Medium = 58% of establishments. Cottage barely visible — formal apprenticeship hasn\'t reached the micro-enterprise long tail yet.',
  data: [
    { label: 'Small',            value: 33.28, color: 'primary' },
    { label: 'Medium',           value: 24.58, color: 'sky' },
    { label: 'Data Not Available', value: 14.65, color: 'amber' },
    { label: 'Others',           value: 10.62, color: 'violet' },
    { label: 'Large',            value: 9.16,  color: 'emerald' },
    { label: 'Micro',            value: 7.61,  color: 'rose' },
  ],
}

export const ESTAB_BY_TYPE = {
  title: 'Establishments by entity type · active + registered',
  columns: [
    { key: 'type',       label: 'Entity type' },
    { key: 'registered', label: 'Registered', type: 'number' },
    { key: 'active',     label: 'Active',     type: 'number' },
    { key: 'ratio',      label: 'Active %',   type: 'percent' },
  ],
  rows: [
    { type: 'Private Sector',     registered: 3342711, active: 218427, ratio: 6.5 },
    { type: 'State Government',   registered: 170978,  active: 10106,  ratio: 5.9 },
    { type: 'Central PSU',        registered: 150043,  active: 11204,  ratio: 7.5 },
    { type: 'Central Government', registered: 143728,  active: 19795,  ratio: 13.8 },
    { type: 'State PSU',          registered: 4226,    active: 968,    ratio: 22.9 },
    { type: 'Co-Operative',       registered: 3735,    active: 13081,  ratio: 350 },
  ],
  highlight: 'Private Sector registered is 96% of total but Active rate is just 6.5%. Co-Op has more active than registered — a data-quality flag worth investigating.',
}

// ── CANDIDATE TAB ────────────────────────────────────────────────────────
export const CAND_KPIS = {
  title: 'Candidate registry',
  items: [
    { label: 'Registered Candidates', value: '1,56,93,905', tone: 'primary' },
    { label: 'Registered PwD',        value: '64,211',      tone: 'fuchsia' },
    { label: 'e-KYC Completed',       value: '9,64,355',    tone: 'emerald' },
    { label: 'Opportunities Applied', value: '4,85,110',    tone: 'sky' },
    { label: 'Average Age',           value: '26 yrs',      tone: 'violet' },
  ],
}

export const CAND_REG_BY_FY = {
  title: 'Candidates registered · year over year',
  unit: 'candidates',
  orient: 'vertical',
  color: 'primary',
  annotation: 'FY-25-26 spike to 30.7 L — outreach + e-KYC drive working. FY-26-27 just begun.',
  data: [
    { label: 'FY-18-19', value: 1195948 },
    { label: 'FY-19-20', value: 1219942 },
    { label: 'FY-20-21', value: 1501226 },
    { label: 'FY-21-22', value: 2309476 },
    { label: 'FY-22-23', value: 2192713 },
    { label: 'FY-23-24', value: 1941741 },
    { label: 'FY-24-25', value: 2054985 },
    { label: 'FY-25-26', value: 3069286 },
    { label: 'FY-26-27', value: 208596  },
  ],
}

export const CAND_BY_AGE = {
  title: 'Candidates by age group',
  unit: 'candidates',
  orient: 'vertical',
  color: 'sky',
  annotation: '23-32 cohort = 8.6 M (55%). 14-17 cohort 50K — early-apprenticeship pipeline thin.',
  data: [
    { label: '14-17', value: 49578   },
    { label: '18-22', value: 2858740 },
    { label: '23-32', value: 8618005 },
    { label: '33-36', value: 820057  },
    { label: '37-40', value: 271146  },
    { label: '40+',   value: 226603  },
  ],
}

export const CAND_BY_QUAL = {
  title: 'Candidates by qualification',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'emerald',
  annotation: '10th + ITI together = 7 M — vocational pipeline is the spine.',
  data: [
    { label: '10th',          value: 4068786 },
    { label: 'ITI',           value: 2948965 },
    { label: '12th',          value: 2701905 },
    { label: 'Graduate',      value: 1354121 },
    { label: 'Diploma',       value: 463911  },
    { label: 'Below Metric',  value: 282275  },
    { label: 'Post Graduate', value: 167541  },
    { label: 'Others',        value: 136988  },
  ],
}

export const CAND_BY_STATE = {
  title: 'Candidates by state · top 12',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'Maharashtra registry at 16.6 L. Bottom-9 states under 30K each — outreach gap in northeast + small UTs.',
  data: [
    { label: 'Maharashtra',     value: 1660619 },
    { label: 'Uttar Pradesh',   value: 1394945 },
    { label: 'Gujarat',         value: 798278  },
    { label: 'Tamil Nadu',      value: 619769  },
    { label: 'Haryana',         value: 503672  },
    { label: 'Andhra Pradesh',  value: 476581  },
    { label: 'Bihar',           value: 428980  },
    { label: 'Karnataka',       value: 304980  },
    { label: 'Madhya Pradesh',  value: 257216  },
    { label: 'West Bengal',     value: 240640  },
    { label: 'Telangana',       value: 169132  },
    { label: 'Rajasthan',       value: 147453  },
  ],
}

// ── TPA TAB ──────────────────────────────────────────────────────────────
export const TPA_KPIS = {
  title: 'TPA performance',
  items: [
    { label: 'Apprentices Engaged (FY)',        value: '28,05,803', tone: 'primary' },
    { label: 'Completed Training (FY)',         value: '28,05,803', tone: 'sky' },
    { label: 'Apprentices Certified (FY)',      value: '2,14,450',  tone: 'emerald' },
    { label: 'e-KYC Completed (FY)',            value: '24,50,258', tone: 'violet' },
  ],
}

export const TPA_BY_ESTAB_TYPE = {
  title: 'Empaneled TPAs by establishment type',
  unit: 'TPAs',
  annotation: 'Private TPAs dominate at 234 of 276 total — government-backed TPAs <10%.',
  data: [
    { label: 'Private Sector',     value: 234, color: 'primary' },
    { label: 'State PSU',          value: 13,  color: 'emerald' },
    { label: 'Co-Operative',       value: 11,  color: 'sky' },
    { label: 'Central PSU',        value: 8,   color: 'violet' },
    { label: 'State Government',   value: 6,   color: 'amber' },
    { label: 'Central Government', value: 4,   color: 'rose' },
  ],
}

export const TPA_BY_STATE = {
  title: 'Empaneled TPAs · top 10 states',
  unit: 'TPAs',
  orient: 'horizontal',
  color: 'primary',
  annotation: 'Maharashtra hosts 76 of 276 TPAs (28%). Northeast + smaller states have <5 TPAs each.',
  data: [
    { label: 'Maharashtra',    value: 76 },
    { label: 'Karnataka',      value: 28 },
    { label: 'Tamil Nadu',     value: 14 },
    { label: 'Delhi',          value: 11 },
    { label: 'Haryana',        value: 8  },
    { label: 'Uttar Pradesh',  value: 7  },
    { label: 'Andhra Pradesh', value: 5  },
    { label: 'West Bengal',    value: 5  },
    { label: 'Gujarat',        value: 4  },
    { label: 'Rajasthan',      value: 4  },
  ],
}

export const TPA_COMPLETION = {
  title: 'TPA performance · completion ratio buckets',
  unit: 'TPAs',
  orient: 'vertical',
  color: 'emerald',
  annotation: '~140 TPAs (50%) deliver <50% completion. Audit candidates: investigate the bottom band first.',
  data: [
    { label: 'Below 50%',     value: 140 },
    { label: '50-60%',        value: 35  },
    { label: '60-70%',        value: 28  },
    { label: '70-80%',        value: 22  },
    { label: '80% and above', value: 51  },
  ],
}

export const TPA_DROPOUT = {
  title: 'TPA performance · dropout ratio buckets',
  unit: 'TPAs',
  orient: 'vertical',
  color: 'rose',
  annotation: '~100 TPAs have >30% dropout — these need immediate placement / industry-link interventions.',
  data: [
    { label: 'Below 10%', value: 68  },
    { label: '10-15%',    value: 22  },
    { label: '15-20%',    value: 31  },
    { label: '20-25%',    value: 19  },
    { label: '25-30%',    value: 23  },
    { label: '>30%',      value: 100 },
  ],
}

export const TPA_CERTIFIED_TREND = {
  title: 'Apprentices certified · FY-21-22 to 23-24',
  xAxis: 'Financial Year', yAxis: 'Certified',
  annotation: 'Certification grew 2.3× in 2 years — credentialing pipeline maturing.',
  series: [
    { name: 'Certified', color: 'emerald', data: [
      { x: 'FY-21-22', y: 134413 },
      { x: 'FY-22-23', y: 210521 },
      { x: 'FY-23-24', y: 314030 },
    ]},
  ],
}

// ── SECTOR TAB ───────────────────────────────────────────────────────────
export const SECTOR_KPIS = {
  title: 'Sector landscape',
  items: [
    { label: 'Apprentices Assessed (FY)',     value: '2,14,450', tone: 'primary' },
    { label: 'Certificates Issued (FY)',      value: '7,49,442', tone: 'emerald' },
    { label: 'Total Sectors',                 value: '52',       tone: 'violet' },
    { label: 'Live Courses',                  value: '924',      tone: 'amber' },
    { label: 'NSQF Aligned Live Courses',     value: '803',      tone: 'sky' },
    { label: 'NON-NSQF Aligned Live',         value: '121',      tone: 'rose' },
    { label: 'Saptarishi Sectors Live',       value: '609',      tone: 'indigo' },
    { label: 'PWD Live Courses',              value: '10',       tone: 'fuchsia' },
  ],
}

export const SECTOR_NSQF = {
  title: 'Courses by NSQF level',
  unit: 'live courses',
  orient: 'vertical',
  color: 'primary',
  annotation: 'NSQF 4 + 5 dominate (440 courses combined) — entry-skill courses; NSQF 6-7 (advanced) only 25.',
  data: [
    { label: 'NSQF 2',   value: 16 },
    { label: 'NSQF 2.5', value: 46 },
    { label: 'NSQF 3',   value: 99 },
    { label: 'NSQF 3.5', value: 37 },
    { label: 'NSQF 4',   value: 185 },
    { label: 'NSQF 4.5', value: 11 },
    { label: 'NSQF 5',   value: 255 },
    { label: 'NSQF 5.5', value: 18 },
    { label: 'NSQF 6',   value: 114 },
    { label: 'NSQF 6.5', value: 24 },
    { label: 'NSQF 7',   value: 28 },
  ],
}

export const SECTOR_COURSES = {
  title: 'Courses per sector · top 12',
  unit: 'live courses',
  orient: 'horizontal',
  color: 'sky',
  annotation: 'IT-ITeS, Logistics, Life Sciences each have 190+ courses — diverse skill demand. Top-12 cover 80% of national courses.',
  data: [
    { label: 'IT-ITeS',                  value: 289 },
    { label: 'Logistics',                value: 239 },
    { label: 'Life Sciences',            value: 191 },
    { label: 'Automotive',               value: 160 },
    { label: 'Tourism & Hospitality',    value: 144 },
    { label: 'Construction',             value: 135 },
    { label: 'Electronics',              value: 135 },
    { label: 'Production & Manufacturing',value: 128 },
    { label: 'BFSI',                     value: 126 },
    { label: 'Healthcare',               value: 106 },
    { label: 'Rubber',                   value: 98 },
    { label: 'Textile',                  value: 95 },
  ],
}

export const SECTOR_WOMEN = {
  title: 'Top 10 sectors engaging women',
  unit: 'women apprentices',
  orient: 'horizontal',
  color: 'fuchsia',
  annotation: 'IT-ITeS engages 219K women — single biggest sector. Construction + Manufacturing lag (women <12K).',
  data: [
    { label: 'IT-ITeS',                  value: 219830 },
    { label: 'Automotive',               value: 160135 },
    { label: 'Retail',                   value: 131590 },
    { label: 'Electronics',              value: 90197  },
    { label: 'BFSI',                     value: 52368  },
    { label: 'Tourism & Hospitality',    value: 42775  },
    { label: 'Logistics',                value: 27940  },
    { label: 'Electrical (Renewable)',   value: 18927  },
    { label: 'Production & Manufacturing',value: 11783 },
    { label: '(Blank)',                  value: 4 },
  ],
}

export const SECTOR_TOP_WOMEN_COURSES = {
  title: 'Top 10 courses engaging women',
  unit: 'women apprentices',
  orient: 'vertical',
  color: 'fuchsia',
  annotation: 'Customer Care Exec leads at 50K women. White-collar entry roles dominate; trade roles (welder, fitter) under-represented.',
  data: [
    { label: 'Customer Care Exec',          value: 50816 },
    { label: 'Comp Op + Programming',       value: 48519 },
    { label: 'Automotive Assembly Op',      value: 47922 },
    { label: 'Automotive Assembly Tech',    value: 33511 },
    { label: 'Retail Trainee Associate',    value: 29154 },
    { label: 'Telecom Customer Care Exec',  value: 29014 },
    { label: 'Retail Sales Assistant',      value: 28003 },
    { label: 'Domestic Data Entry Op',      value: 25830 },
    { label: 'Retail Trainee Assoc V3',     value: 22891 },
    { label: 'Assembly Line Operator',      value: 21743 },
  ],
}

// ── ANALYTICS TAB ────────────────────────────────────────────────────────
export const ANALYTICS_KPIS = {
  title: 'Decomposition headline',
  items: [
    { label: 'Apprentices Engaged',  value: '51,38,125', tone: 'primary' },
    { label: 'Male',                 value: '40,06,837', tone: 'sky' },
    { label: 'Female',               value: '11,31,198', tone: 'fuchsia' },
    { label: 'General Category',     value: '20,48,728', tone: 'emerald' },
    { label: 'OBC Category',         value: '12,64,095', tone: 'amber' },
    { label: 'SC Category',          value: '4,94,670',  tone: 'violet' },
    { label: 'ST Category',          value: '1,86,703',  tone: 'rose' },
  ],
}

export const ANALYTICS_NSQF = {
  title: 'NSQF level distribution · apprentices engaged',
  unit: 'apprentices',
  orient: 'vertical',
  color: 'primary',
  annotation: 'NSQF 3 + 4 dominate at 21.4 L + 13.3 L combined — entry-skill cohort.',
  data: [
    { label: 'NSQF 1',   value: 0 },
    { label: 'NSQF 2',   value: 88507 },
    { label: 'NSQF 2.5', value: 0 },
    { label: 'NSQF 3',   value: 2138443 },
    { label: 'NSQF 3.5', value: 0 },
    { label: 'NSQF 4',   value: 1333858 },
    { label: 'NSQF 4.5', value: 0 },
    { label: 'NSQF 5',   value: 1257879 },
    { label: 'NSQF 5.5', value: 0 },
    { label: 'NSQF 6',   value: 0 },
    { label: 'NSQF 7',   value: 0 },
  ],
}

export const ANALYTICS_APPLICATIONS = {
  title: 'Multiple applications by candidate',
  unit: 'candidates',
  orient: 'horizontal',
  color: 'sky',
  annotation: '2.3 M candidates apply ≤5 times — most apply once and disengage. <0.5 M apply 5+ times.',
  data: [
    { label: 'Below 5 apps',  value: 2286656 },
    { label: '5-10 apps',     value: 178739  },
    { label: '10-20 apps',    value: 132194  },
    { label: '20-50 apps',    value: 101449  },
    { label: '50+ apps',      value: 51270   },
  ],
}

export const ANALYTICS_APPS_GENERATED = {
  title: 'Applications generated per year',
  xAxis: 'Year', yAxis: 'Applications',
  annotation: '2024 peaked at 4.28 M applications. 2025 dropped to 2.97 M — investigate cause.',
  series: [
    { name: 'Applications', color: 'primary', data: [
      { x: '2018', y: 9720 },
      { x: '2019', y: 401560 },
      { x: '2020', y: 172748 },
      { x: '2021', y: 2528260 },
      { x: '2022', y: 2385795 },
      { x: '2023', y: 3959828 },
      { x: '2024', y: 4282765 },
      { x: '2025', y: 2971117 },
    ]},
  ],
}

// ── DBT (Direct Benefit Transfer) — limited PDF; build from header KPIs ──
export const DBT_KPIS = {
  title: 'Direct Benefit Transfer · NAPS stipend',
  items: [
    { label: 'DBT Paid (cumulative)', value: '₹775.94 Cr', tone: 'emerald' },
    { label: 'As of',                  value: '22/04/2025', tone: 'sky' },
    { label: 'Eligible cohort',        value: '~50 L apprentices', tone: 'primary' },
    { label: 'Avg disbursal / month',  value: '~₹15-18 Cr', tone: 'amber' },
  ],
}

// ── COMPACT NAPS BRIEF for Saathi's role context ─────────────────────────
// One paragraph the LLM can quote verbatim — used in role_context buildup.
export const NAPS_PROMPT_BRIEF = `
NAPS (NATIONAL APPRENTICESHIP PROMOTION SCHEME) SNAPSHOT — as of 22/04/2025:
- Apprentices Engaged: 51,38,125 (Male 40,06,837 / Female 11,31,198 / Transgender 39)
- Completed Training: 26,39,961 · Ongoing: 9,72,489 · Certified: 7,49,442
- Active Establishments: 36,366 · Registered: 1,15,368
- DBT Paid: ₹775.94 Cr
- Top sectors (engagement): Automotive 10.3 L · IT-ITeS 4.96 L · Electronics 4.39 L · Retail 4.10 L
- Top states (engagement): Maharashtra 13.1 L · Gujarat 5.5 L · Tamil Nadu 5.2 L
- Top courses (engagement): Electrician 308K · Fitter 296K · Auto Assembly Op 209K
- Social category: General 39.9% · OBC 24.6% · SC 9.6% · ST 3.6% (SC/ST under-share vs population)
- Live courses: 924 (NSQF-aligned 803 · Non-NSQF 121 · Saptarishi 609 · PwD 10)
- TPAs empaneled: 276 (Private 234 · State PSU 13 · Co-op 11 · Central PSU 8 · State Govt 6 · Central Govt 4)
- TPA performance: ~140 TPAs (50%) deliver <50% completion. ~100 TPAs have >30% dropout — audit candidates.
- Trend: FY-25-26 peak 12.3 L engaged · 30.7 L candidate registrations (record)
- Registered candidates total: 1,56,93,905 · Avg age 26 · PwD 64,211 · e-KYC done 9,64,355

FILTERS available to scope ANY question: Financial Year (18-19 to 26-27), State, District,
Gender (M/F/T), Special District (Aspirational / Border / LWE / Naxal / Tribal),
Contract Type (Designated / Optional), Sector, Category, Course Type, Establishment Type.
`
