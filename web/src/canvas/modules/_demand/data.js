// Secure-Demand fixture.
//
// The leading signal we capture: before a batch starts, the centre should
// already have ≥ 1.5× the job slots committed by employers.
// We model this as Employer Commitments held at the TP HQ level, allocated
// down to specific Training Centres, then confirmed locally with branch-level
// contacts and slot counts.
//
// The same record powers BOTH:
//   • TP Demand Master canvas — sees the full national MoU + allocation matrix
//   • TC Demand Board canvas — sees only the slice allocated to that centre
//
// All numbers illustrative. Sized for Magic Bus India Foundation (10 centres).

import { CENTRES, TP_ROLLUP } from '../_tp/data.js'

// Planned enrolment per centre, broken down by track (job role).
// Each entry: { role: '…', sector: '…', seats: N }
// Track names are aligned with the employer MoU `role` field so the demand
// ratio can be computed per-track, not just at centre level. A "no-supply"
// track (e.g., Guwahati's RSA track) tells the funder where the gap is.
export const PLANNED_ENROLMENT_TRACKS = {
  'tc-patna': [
    { role: 'Customer Service Officer',                     sector: 'BFSI',       seats: 20 },
    { role: 'General Duty Assistant',                       sector: 'Healthcare', seats: 25 },
    { role: 'Customer Service Associate — Telecom Retail',  sector: 'Telecom',    seats: 25 },
    { role: 'Store Associate',                              sector: 'Retail',     seats: 25 },
  ],
  'tc-bhopal': [
    { role: 'Customer Service Officer',     sector: 'BFSI',         seats: 30 },
    { role: 'Retail Sales Associate',       sector: 'Retail',       seats: 30 },
    { role: 'Assistant Electrician',        sector: 'Construction', seats: 35 },
    { role: 'Production Operator',          sector: 'Manufacturing',seats: 35 },
  ],
  'tc-indore': [
    { role: 'Retail Sales Associate',       sector: 'Retail',        seats: 30 },
    { role: 'General Duty Assistant',       sector: 'Healthcare',    seats: 25 },
    { role: 'Production Operator',          sector: 'Manufacturing', seats: 30 },
    { role: 'Store Associate',              sector: 'Retail',        seats: 25 },
  ],
  'tc-ranchi': [
    { role: 'Automotive Assembly Operator', sector: 'Automotive',   seats: 25 },
    { role: 'Assistant Electrician',        sector: 'Construction', seats: 30 },
    { role: 'Store Associate',              sector: 'Retail',       seats: 20 },
  ],
  'tc-jaipur': [
    { role: 'Retail Sales Associate',                       sector: 'Retail',       seats: 25 },
    { role: 'Food & Beverage Service Steward',              sector: 'Hospitality',  seats: 35 },
    { role: 'Customer Service Associate — Telecom Retail',  sector: 'Telecom',      seats: 30 },
  ],
  'tc-lucknow': [
    { role: 'Customer Service Officer',     sector: 'BFSI',       seats: 30 },
    { role: 'General Duty Assistant',       sector: 'Healthcare', seats: 25 },
    { role: 'Last-Mile Delivery Associate', sector: 'E-commerce', seats: 40 },
    { role: 'Store Associate',              sector: 'Retail',     seats: 25 },
  ],
  'tc-kolkata': [
    { role: 'Retail Sales Associate',                       sector: 'Retail',     seats: 20 },
    { role: 'Customer Care Executive — Voice',              sector: 'IT-ITeS',    seats: 25 },
    { role: 'Customer Service Associate — Telecom Retail',  sector: 'Telecom',    seats: 25 },
    { role: 'General Duty Assistant',                       sector: 'Healthcare', seats: 25 },
  ],
  'tc-bengaluru': [
    { role: 'Automotive Assembly Operator', sector: 'Automotive',    seats: 25 },
    { role: 'Customer Care Executive — Voice', sector: 'IT-ITeS',    seats: 30 },
    { role: 'Food & Beverage Service Steward', sector: 'Hospitality',seats: 15 },
    { role: 'Last-Mile Delivery Associate', sector: 'E-commerce',    seats: 20 },
    { role: 'Production Operator',          sector: 'Manufacturing', seats: 15 },
  ],
  'tc-guwahati': [
    { role: 'Store Associate',              sector: 'Retail',     seats: 20 },
    { role: 'General Duty Assistant',       sector: 'Healthcare', seats: 20 },
    { role: 'Retail Sales Associate',       sector: 'Retail',     seats: 20 },
  ],
  'tc-bhubaneswar': [
    { role: 'General Duty Assistant', sector: 'Healthcare', seats: 60 },
    { role: 'Store Associate',        sector: 'Retail',     seats: 30 },
  ],
}

// Aggregate totals are derived from the track breakdown so they always match.
// NOTE: This is the seed total. Once a centre edits its plan via the UI, all
// downstream ratios go through getPlannedTracks() / getPlannedTotal(), which
// check the localStorage override first. PLANNED_ENROLMENT stays for any
// legacy reads but it's no longer the source of truth.
export const PLANNED_ENROLMENT = Object.fromEntries(
  Object.entries(PLANNED_ENROLMENT_TRACKS).map(([k, tracks]) => [k, tracks.reduce((s, t) => s + t.seats, 0)])
)

// ── Centre-editable planned-enrolment overrides ──────────────────────────
// The TC is the source of the planned-enrolment signal. They must be able to
// adjust seats, remove a track, or add one — so when demand allocations
// shift, the centre can re-balance instead of staying blocked.
//
// Stored in localStorage; cleared per-centre when an override is unset.

const PLANNED_OVERRIDES_KEY = 'ksk:demand:planned-overrides'

function readPlannedOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(PLANNED_OVERRIDES_KEY) || '{}')
  } catch { return {} }
}

export function getPlannedTracks(centreId) {
  const overrides = readPlannedOverrides()
  if (overrides[centreId]) return overrides[centreId]
  return PLANNED_ENROLMENT_TRACKS[centreId] || []
}

export function getPlannedTotal(centreId) {
  return getPlannedTracks(centreId).reduce((s, t) => s + (Number(t.seats) || 0), 0)
}

export function writePlannedTracks(centreId, tracks, actor) {
  if (typeof window === 'undefined') return
  const before = getPlannedTracks(centreId)
  const overrides = readPlannedOverrides()
  // Clean payload: keep only role/sector/seats fields, drop empty rows.
  const clean = (tracks || [])
    .map(t => ({
      role: (t.role || '').trim(),
      sector: (t.sector || '').trim() || 'Unspecified',
      seats: Math.max(0, Number(t.seats) || 0),
    }))
    .filter(t => t.role && t.seats > 0)
  overrides[centreId] = clean
  try {
    window.localStorage.setItem(PLANNED_OVERRIDES_KEY, JSON.stringify(overrides))
    appendPlanAudit({ centreId, before, after: clean, actor, kind: 'edit' })
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function resetPlannedTracks(centreId, actor) {
  if (typeof window === 'undefined') return
  const before = getPlannedTracks(centreId)
  const overrides = readPlannedOverrides()
  delete overrides[centreId]
  try {
    window.localStorage.setItem(PLANNED_OVERRIDES_KEY, JSON.stringify(overrides))
    appendPlanAudit({ centreId, before, after: PLANNED_ENROLMENT_TRACKS[centreId] || [], actor, kind: 'reset' })
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function hasPlanOverride(centreId) {
  return Boolean(readPlannedOverrides()[centreId])
}

// ── Plan-edit audit log ───────────────────────────────────────────────────
// Records every plan change with who/when/before/after. Surfaces in two
// places: in the TC Demand Board planned drilldown (centre's own history),
// and on the TP Demand Master (HQ sees which centres have overridden).

const PLAN_AUDIT_KEY = 'ksk:demand:plan-audit'

export function readPlanAudit() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(PLAN_AUDIT_KEY) || '[]')
  } catch { return [] }
}

function appendPlanAudit({ centreId, before, after, actor, kind }) {
  const ev = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    centreId,
    centreName: (CENTRES.find(c => c.id === centreId) || {}).name || centreId,
    actor: actor || { name: 'Centre head', role: 'training_centre' },
    at: new Date().toISOString(),
    kind, // 'edit' | 'reset'
    before,
    after,
    totalBefore: before.reduce((s, t) => s + (Number(t.seats) || 0), 0),
    totalAfter:  after .reduce((s, t) => s + (Number(t.seats) || 0), 0),
    changes: diffPlans(before, after),
  }
  const rows = readPlanAudit()
  rows.unshift(ev) // newest first
  try {
    window.localStorage.setItem(PLAN_AUDIT_KEY, JSON.stringify(rows.slice(0, 200))) // cap at 200
  } catch {}
}

function diffPlans(before, after) {
  const map = new Map()
  for (const t of before) map.set(t.role, { ...t, _was: t.seats })
  const changes = []
  for (const t of after) {
    const prev = map.get(t.role)
    if (!prev) {
      changes.push({ type: 'added', role: t.role, sector: t.sector, before: 0, after: t.seats })
    } else {
      if (prev.seats !== t.seats) {
        changes.push({ type: t.seats > prev.seats ? 'increased' : 'reduced', role: t.role, sector: t.sector, before: prev.seats, after: t.seats })
      }
      map.delete(t.role)
    }
  }
  // Anything left in `map` was removed.
  for (const [role, t] of map.entries()) {
    changes.push({ type: 'removed', role, sector: t.sector, before: t.seats, after: 0 })
  }
  return changes
}

export function auditForCentre(centreId) {
  return readPlanAudit().filter(e => e.centreId === centreId)
}

export function centresWithOverrides() {
  const overrides = readPlannedOverrides()
  return Object.keys(overrides).map(centreId => ({
    centreId,
    centreName: (CENTRES.find(c => c.id === centreId) || {}).name || centreId,
    tracks: overrides[centreId],
    auditEvents: auditForCentre(centreId),
    lastEdit: auditForCentre(centreId)[0] || null,
  }))
}

// ── Employer Commitments (national MoUs held by Magic Bus HQ) ────────────
//
// Design intent of the fixture:
//   • 9 of 10 centres should comfortably pass the 1.0× batch-creation gate
//     and have a healthy mix of MoUs (3–4 employers each).
//   • Guwahati is intentionally left under-supplied — the story is "this
//     centre needs intervention." That's the one batch-blocked example.
//   • A few centres have one pending allocation each, so the "Confirm with
//     branch" workflow can be demonstrated live.
//   • Mixed sectors: BFSI, Retail, Healthcare, Automotive, IT-BPS,
//     Hospitality, Construction, Telecom, E-commerce/Logistics, Manufacturing.

export const EMPLOYER_COMMITMENTS = [
  // ── BFSI ────────────────────────────────────────────────────────────
  {
    id: 'mou-hdfc-csr-q3',
    employer: { name: 'HDFC Bank', gstin: '27AAACH2702H1Z3', sector: 'BFSI', tone: 'sky' },
    role: 'Customer Service Officer',
    nsqfLevel: 5,
    totalSlots: 80,
    ctcMonthly: { min: 18_000, max: 24_000 },
    signedLetterStub: 'HDFC-MoU-2026-Q3.pdf',
    signedLetterParsedSlots: 80,
    validityFrom: '2026-04-01',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Priya Mehra', role: 'AVP — Branch Banking HR', phone: '+91 98••• ••980', email: 'priya.mehra@hdfcbank.com' },
    status: 'active',
    createdAt: '2026-03-15',
    skillDemandSheet: [
      { rank: 1, skill: 'Customer query handling (Hindi + English)' },
      { rank: 2, skill: 'KYC document verification' },
      { rank: 3, skill: 'CRM data entry (Finacle / HDFC LOS)' },
      { rank: 4, skill: 'Cross-sell pitch (CASA, FD, credit card)' },
      { rank: 5, skill: 'Grievance de-escalation' },
      { rank: 6, skill: 'AML basics + suspicious transaction reporting' },
      { rank: 7, skill: 'Cash handling + denomination accuracy' },
      { rank: 8, skill: 'Digital banking onboarding (NetBanking, UPI)' },
    ],
    allocations: [
      { centreId: 'tc-patna',    branchName: 'HDFC Boring Road, Patna',       branchContactName: 'Rohan Verma',  branchContactPhone: '+91 98••• ••101', allocated: 20, confirmed: 18, status: 'confirmed', confirmedAt: '2026-03-22' },
      { centreId: 'tc-lucknow',  branchName: 'HDFC Hazratganj, Lucknow',      branchContactName: 'Anita Saxena', branchContactPhone: '+91 98••• ••102', allocated: 30, confirmed: 30, status: 'confirmed', confirmedAt: '2026-03-24' },
      { centreId: 'tc-bhopal',   branchName: 'HDFC New Market, Bhopal',       branchContactName: '',             branchContactPhone: '',                allocated: 30, confirmed:  0, status: 'pending'   },
    ],
  },

  // ── Retail ──────────────────────────────────────────────────────────
  {
    id: 'mou-reliance-retail-q3',
    employer: { name: 'Reliance Retail', gstin: '27AAACR5055K1ZF', sector: 'Retail', tone: 'rose' },
    role: 'Retail Sales Associate',
    nsqfLevel: 4,
    totalSlots: 120,
    ctcMonthly: { min: 14_000, max: 18_000 },
    signedLetterStub: 'Reliance-Retail-Demand-Note-Q3.pdf',
    signedLetterParsedSlots: 120,
    validityFrom: '2026-04-15',
    validityUntil: '2026-08-31',
    contactPerson: { name: 'Karan Bhatia', role: 'Cluster HR — North', phone: '+91 98••• ••721', email: 'karan.bhatia@ril.com' },
    status: 'active',
    createdAt: '2026-03-10',
    skillDemandSheet: [
      { rank: 1, skill: 'Customer greeting + needs discovery' },
      { rank: 2, skill: 'POS billing (SAP retail terminal)' },
      { rank: 3, skill: 'Inventory cycle counting' },
      { rank: 4, skill: 'Visual merchandising' },
      { rank: 5, skill: 'Returns + exchange handling' },
      { rank: 6, skill: 'Cross-category product knowledge' },
      { rank: 7, skill: 'Standing shift stamina + grooming' },
      { rank: 8, skill: 'Bilingual customer interaction' },
    ],
    allocations: [
      { centreId: 'tc-bhopal',  branchName: 'Smart Bazaar, DB Mall',        branchContactName: 'Naveen Singh', branchContactPhone: '+91 98••• ••301', allocated: 40, confirmed: 40, status: 'confirmed', confirmedAt: '2026-03-18' },
      { centreId: 'tc-indore',  branchName: 'Reliance Smart, Treasure Bay', branchContactName: 'Pooja Sharma', branchContactPhone: '+91 98••• ••302', allocated: 35, confirmed: 35, status: 'confirmed', confirmedAt: '2026-03-19' },
      { centreId: 'tc-jaipur',  branchName: 'Trends, Vaishali Nagar',       branchContactName: 'Vikram Joshi', branchContactPhone: '+91 98••• ••303', allocated: 25, confirmed: 22, status: 'confirmed', confirmedAt: '2026-03-21' },
      { centreId: 'tc-kolkata', branchName: 'Smart Bazaar, Salt Lake',      branchContactName: 'Anwesha Roy',  branchContactPhone: '+91 98••• ••304', allocated: 20, confirmed: 18, status: 'confirmed', confirmedAt: '2026-03-22' },
    ],
  },

  // ── Automotive ──────────────────────────────────────────────────────
  {
    id: 'mou-tata-motors-q3',
    employer: { name: 'Tata Motors', gstin: '27AAACT2727Q1ZW', sector: 'Automotive', tone: 'indigo' },
    role: 'Automotive Assembly Operator',
    nsqfLevel: 4,
    totalSlots: 60,
    ctcMonthly: { min: 16_500, max: 21_000 },
    signedLetterStub: 'Tata-Motors-Pune-Q3-Hiring.pdf',
    signedLetterParsedSlots: 60,
    validityFrom: '2026-04-01',
    validityUntil: '2026-07-31',
    contactPerson: { name: 'Sanjay Kulkarni', role: 'HR Lead — Pimpri Plant', phone: '+91 98••• ••441', email: 'sanjay.kulkarni@tatamotors.com' },
    status: 'active',
    createdAt: '2026-03-08',
    skillDemandSheet: [
      { rank: 1, skill: 'Assembly-line safety (PPE + 5S)' },
      { rank: 2, skill: 'Torque wrench + pneumatic tool handling' },
      { rank: 3, skill: 'Read assembly drawings + work instructions' },
      { rank: 4, skill: 'Quality inspection (visual + dimensional)' },
      { rank: 5, skill: 'Lean / Kaizen basics' },
      { rank: 6, skill: 'Shift discipline + clock-in punctuality' },
    ],
    allocations: [
      { centreId: 'tc-bengaluru', branchName: 'Tata Motors, Hosur Plant',      branchContactName: 'Manoj Iyer',   branchContactPhone: '+91 98••• ••551', allocated: 35, confirmed: 35, status: 'confirmed', confirmedAt: '2026-03-12' },
      { centreId: 'tc-ranchi',    branchName: 'Tata Motors, Jamshedpur Plant', branchContactName: 'Bipul Mahato', branchContactPhone: '+91 98••• ••552', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-03-14' },
    ],
  },

  // ── IT-ITeS ─────────────────────────────────────────────────────────
  {
    id: 'mou-wipro-bpo-q3',
    employer: { name: 'Wipro BPS', gstin: '29AAACW7505P1ZD', sector: 'IT-ITeS', tone: 'violet' },
    role: 'Customer Care Executive — Voice',
    nsqfLevel: 5,
    totalSlots: 70,
    ctcMonthly: { min: 17_000, max: 22_000 },
    signedLetterStub: 'Wipro-BPS-Q3-DemandNote.pdf',
    signedLetterParsedSlots: 70,
    validityFrom: '2026-05-01',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Aishwarya Reddy', role: 'TA Manager — South', phone: '+91 98••• ••811', email: 'aishwarya.reddy@wipro.com' },
    status: 'active',
    createdAt: '2026-04-02',
    skillDemandSheet: [
      { rank: 1, skill: 'Neutral accent voice + diction' },
      { rank: 2, skill: 'Active listening + summarisation' },
      { rank: 3, skill: 'CRM ticket logging (ServiceNow)' },
      { rank: 4, skill: 'Empathy phrases + de-escalation' },
      { rank: 5, skill: 'Typing speed ≥ 30 WPM' },
      { rank: 6, skill: 'Process compliance + data privacy' },
      { rank: 7, skill: 'Night-shift readiness' },
    ],
    allocations: [
      { centreId: 'tc-bengaluru', branchName: 'Wipro Electronic City',     branchContactName: 'Rakesh Naidu',  branchContactPhone: '+91 98••• ••701', allocated: 40, confirmed: 38, status: 'confirmed', confirmedAt: '2026-04-08' },
      { centreId: 'tc-kolkata',   branchName: 'Wipro Salt Lake Sector V',  branchContactName: 'Suparna Ghosh', branchContactPhone: '+91 98••• ••702', allocated: 30, confirmed: 30, status: 'confirmed', confirmedAt: '2026-04-10' },
    ],
  },

  // ── Healthcare ──────────────────────────────────────────────────────
  {
    id: 'mou-apollo-gda-q3',
    employer: { name: 'Apollo Hospitals', gstin: '36AAACA9301F1Z7', sector: 'Healthcare', tone: 'emerald' },
    role: 'General Duty Assistant',
    nsqfLevel: 4,
    totalSlots: 130,
    ctcMonthly: { min: 15_000, max: 19_000 },
    signedLetterStub: 'Apollo-GDA-Demand-Q3.pdf',
    signedLetterParsedSlots: 130,
    validityFrom: '2026-04-01',
    validityUntil: '2026-08-31',
    contactPerson: { name: 'Dr Meera Iyer', role: 'Nursing Operations Head', phone: '+91 98••• ••991', email: 'meera.iyer@apollohospitals.com' },
    status: 'active',
    createdAt: '2026-03-20',
    skillDemandSheet: [
      { rank: 1, skill: 'Patient hygiene + bed-making' },
      { rank: 2, skill: 'Vital-sign measurement (BP, pulse, temp)' },
      { rank: 3, skill: 'Infection control + PPE protocol' },
      { rank: 4, skill: 'Patient ambulation + safe lifting' },
      { rank: 5, skill: 'Bedside communication + empathy' },
      { rank: 6, skill: 'Basic record-keeping (patient charts)' },
    ],
    allocations: [
      { centreId: 'tc-indore',      branchName: 'Apollo Hospital, Vijay Nagar',   branchContactName: 'Sister Latha', branchContactPhone: '+91 98••• ••601', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-03-25' },
      { centreId: 'tc-bhubaneswar', branchName: 'Apollo Hospital, Sainik School', branchContactName: 'Sister Reema', branchContactPhone: '+91 98••• ••602', allocated: 40, confirmed: 40, status: 'confirmed', confirmedAt: '2026-03-26' },
      { centreId: 'tc-patna',       branchName: 'Apollo Patliputra',              branchContactName: 'Dr Asha',      branchContactPhone: '+91 98••• ••603', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-03-28' },
      { centreId: 'tc-lucknow',     branchName: 'Apollomedics, Sushant Golf City',branchContactName: 'Sister Vandana',branchContactPhone:'+91 98••• ••604', allocated: 25, confirmed: 22, status: 'confirmed', confirmedAt: '2026-03-30' },
    ],
  },

  // ── Hospitality ─────────────────────────────────────────────────────
  {
    id: 'mou-hyatt-hospitality-q3',
    employer: { name: 'Hyatt Hotels', gstin: '07AAACH8888K1ZA', sector: 'Hospitality', tone: 'fuchsia' },
    role: 'Food & Beverage Service Steward',
    nsqfLevel: 4,
    totalSlots: 70,
    ctcMonthly: { min: 14_500, max: 18_500 },
    signedLetterStub: 'Hyatt-Hotels-Q3-FB-Demand.pdf',
    signedLetterParsedSlots: 70,
    validityFrom: '2026-04-15',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Rohit Khanna', role: 'HR Manager — North & West', phone: '+91 98••• ••772', email: 'rohit.khanna@hyatt.com' },
    status: 'active',
    createdAt: '2026-03-30',
    skillDemandSheet: [
      { rank: 1, skill: 'Table laying + service flow' },
      { rank: 2, skill: 'Order taking + POS billing (IDS / Opera)' },
      { rank: 3, skill: 'Cocktail and beverage knowledge' },
      { rank: 4, skill: 'Guest interaction in English + one regional language' },
      { rank: 5, skill: 'Personal grooming + hospitality etiquette' },
      { rank: 6, skill: 'Food allergens + dietary restrictions awareness' },
    ],
    allocations: [
      { centreId: 'tc-jaipur',    branchName: 'Hyatt Regency, Jaipur',       branchContactName: 'Ashish Sharma',branchContactPhone: '+91 98••• ••821', allocated: 45, confirmed: 42, status: 'confirmed', confirmedAt: '2026-04-02' },
      { centreId: 'tc-bengaluru', branchName: 'Grand Hyatt, Bangalore',      branchContactName: 'Priya Nair',   branchContactPhone: '+91 98••• ••822', allocated: 20, confirmed: 20, status: 'confirmed', confirmedAt: '2026-04-04' },
    ],
  },

  // ── Construction ────────────────────────────────────────────────────
  {
    id: 'mou-lt-construction-q3',
    employer: { name: 'Larsen & Toubro', gstin: '27AAACL0140P1Z3', sector: 'Construction', tone: 'amber' },
    role: 'Assistant Electrician',
    nsqfLevel: 4,
    totalSlots: 100,
    ctcMonthly: { min: 17_500, max: 22_000 },
    signedLetterStub: 'LT-Construction-Q3-Electrician.pdf',
    signedLetterParsedSlots: 100,
    validityFrom: '2026-04-01',
    validityUntil: '2026-10-31',
    contactPerson: { name: 'Suresh Patil', role: 'Project HR Head — Western Region', phone: '+91 98••• ••331', email: 'suresh.patil@larsentoubro.com' },
    status: 'active',
    createdAt: '2026-03-05',
    skillDemandSheet: [
      { rank: 1, skill: 'Single-phase + three-phase wiring' },
      { rank: 2, skill: 'Conduit installation + cable pulling' },
      { rank: 3, skill: 'Read electrical drawings + schematics' },
      { rank: 4, skill: 'Earthing + safety isolation' },
      { rank: 5, skill: 'Electrical hand tools + multimeter use' },
      { rank: 6, skill: 'Site safety protocols (PPE, height work)' },
    ],
    allocations: [
      { centreId: 'tc-bhopal', branchName: 'L&T Hyderabad Metro Site',  branchContactName: 'Rajesh Kumar', branchContactPhone: '+91 98••• ••341', allocated: 50, confirmed: 48, status: 'confirmed', confirmedAt: '2026-03-15' },
      { centreId: 'tc-ranchi', branchName: 'L&T Bokaro Power Project',  branchContactName: 'Arvind Tiwari',branchContactPhone: '+91 98••• ••342', allocated: 30, confirmed: 28, status: 'confirmed', confirmedAt: '2026-03-17' },
    ],
  },

  // ── Telecom retail ──────────────────────────────────────────────────
  {
    id: 'mou-airtel-csa-q3',
    employer: { name: 'Bharti Airtel', gstin: '07AAACB2894G1ZS', sector: 'Telecom', tone: 'rose' },
    role: 'Customer Service Associate — Telecom Retail',
    nsqfLevel: 4,
    totalSlots: 85,
    ctcMonthly: { min: 15_500, max: 19_000 },
    signedLetterStub: 'Airtel-CSA-Q3-Demand.pdf',
    signedLetterParsedSlots: 85,
    validityFrom: '2026-04-15',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Vandana Kapoor', role: 'Retail Operations — North', phone: '+91 98••• ••211', email: 'vandana.kapoor@airtel.com' },
    status: 'active',
    createdAt: '2026-04-01',
    skillDemandSheet: [
      { rank: 1, skill: 'SIM activation + KYC compliance' },
      { rank: 2, skill: 'Prepaid + postpaid plan recommendation' },
      { rank: 3, skill: 'Airtel Thanks app + UPI onboarding' },
      { rank: 4, skill: 'In-store customer complaint resolution' },
      { rank: 5, skill: 'Cross-sell — DTH, broadband, payments bank' },
      { rank: 6, skill: 'Daily sales reporting + closing' },
    ],
    allocations: [
      { centreId: 'tc-patna',   branchName: 'Airtel Store, Boring Road',    branchContactName: 'Sanjay Mishra',branchContactPhone: '+91 98••• ••221', allocated: 30, confirmed: 30, status: 'confirmed', confirmedAt: '2026-04-05' },
      { centreId: 'tc-jaipur',  branchName: 'Airtel Store, MI Road',        branchContactName: 'Neha Agarwal', branchContactPhone: '+91 98••• ••222', allocated: 30, confirmed: 30, status: 'confirmed', confirmedAt: '2026-04-06' },
      { centreId: 'tc-kolkata', branchName: 'Airtel Store, Park Street',    branchContactName: 'Sourav Banerjee', branchContactPhone:'+91 98••• ••223', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-04-08' },
    ],
  },

  // ── E-commerce / Logistics ──────────────────────────────────────────
  {
    id: 'mou-flipkart-logistics-q3',
    employer: { name: 'Flipkart', gstin: '29AAFCS9826H1ZP', sector: 'E-commerce', tone: 'sky' },
    role: 'Last-Mile Delivery Associate',
    nsqfLevel: 3,
    totalSlots: 100,
    ctcMonthly: { min: 16_000, max: 20_000 },
    signedLetterStub: 'Flipkart-Last-Mile-Q3-Demand.pdf',
    signedLetterParsedSlots: 100,
    validityFrom: '2026-04-01',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Karthik Raghavan', role: 'Hub Operations — South & East', phone: '+91 98••• ••421', email: 'karthik.r@flipkart.com' },
    status: 'active',
    createdAt: '2026-03-12',
    skillDemandSheet: [
      { rank: 1, skill: 'Two-wheeler riding + traffic safety' },
      { rank: 2, skill: 'Use of Flipkart Wishmaster app' },
      { rank: 3, skill: 'Parcel handover + customer signature flow' },
      { rank: 4, skill: 'Route planning + on-time delivery' },
      { rank: 5, skill: 'Customer interaction + complaint handling' },
      { rank: 6, skill: 'Cash collection + UPI handling' },
    ],
    allocations: [
      { centreId: 'tc-bengaluru', branchName: 'Flipkart Hub, Bommanahalli', branchContactName: 'Vinod Reddy', branchContactPhone: '+91 98••• ••431', allocated: 50, confirmed: 50, status: 'confirmed', confirmedAt: '2026-03-18' },
      { centreId: 'tc-lucknow',   branchName: 'Flipkart Hub, Chinhat',      branchContactName: 'Ankit Verma', branchContactPhone: '+91 98••• ••432', allocated: 50, confirmed: 50, status: 'confirmed', confirmedAt: '2026-03-20' },
    ],
  },

  // ── Manufacturing ───────────────────────────────────────────────────
  {
    id: 'mou-maruti-suzuki-q3',
    employer: { name: 'Maruti Suzuki', gstin: '06AAACM4933E1ZQ', sector: 'Manufacturing', tone: 'teal' },
    role: 'Production Operator',
    nsqfLevel: 4,
    totalSlots: 130,
    ctcMonthly: { min: 17_000, max: 22_500 },
    signedLetterStub: 'Maruti-Production-Q3.pdf',
    signedLetterParsedSlots: 130,
    validityFrom: '2026-04-01',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Akash Bansal', role: 'HR — Manesar Plant', phone: '+91 98••• ••551', email: 'akash.bansal@maruti.co.in' },
    status: 'active',
    createdAt: '2026-03-06',
    skillDemandSheet: [
      { rank: 1, skill: 'Operate CNC + manual machines' },
      { rank: 2, skill: 'Read engineering drawings + GD&T' },
      { rank: 3, skill: 'Quality control + SPC charts' },
      { rank: 4, skill: '5S + TPM basics' },
      { rank: 5, skill: 'Workstation safety + lockout-tagout' },
      { rank: 6, skill: 'Shift handover + production logging' },
    ],
    allocations: [
      { centreId: 'tc-bhopal',      branchName: 'Maruti Suzuki, Manesar Plant',     branchContactName: 'Rajeev Singh', branchContactPhone: '+91 98••• ••561', allocated: 60, confirmed: 55, status: 'confirmed', confirmedAt: '2026-03-14' },
      { centreId: 'tc-indore',      branchName: 'Maruti Suzuki, Gurugram Plant',    branchContactName: 'Amit Saxena',  branchContactPhone: '+91 98••• ••562', allocated: 40, confirmed: 38, status: 'confirmed', confirmedAt: '2026-03-16' },
      { centreId: 'tc-bengaluru',   branchName: 'Maruti Suzuki, Bangalore Region',  branchContactName: 'Shrikant Rao', branchContactPhone: '+91 98••• ••563', allocated: 30, confirmed: 28, status: 'confirmed', confirmedAt: '2026-03-19' },
    ],
  },

  // ── Retail (mid-tier) ───────────────────────────────────────────────
  {
    id: 'mou-spencers-retail-q3',
    employer: { name: "Spencer's Retail", gstin: '19AABCS0451H1Z9', sector: 'Retail', tone: 'violet' },
    role: 'Store Associate',
    nsqfLevel: 3,
    totalSlots: 200,
    ctcMonthly: { min: 13_500, max: 17_000 },
    signedLetterStub: 'Spencers-Q3-Store-Demand.pdf',
    signedLetterParsedSlots: 200,
    validityFrom: '2026-04-01',
    validityUntil: '2026-09-15',
    contactPerson: { name: 'Aniket Bose', role: 'AVP — Retail Operations', phone: '+91 98••• ••671', email: 'aniket.bose@spencersretail.com' },
    status: 'active',
    createdAt: '2026-03-04',
    skillDemandSheet: [
      { rank: 1, skill: 'Stock receiving + putaway' },
      { rank: 2, skill: 'POS billing + tender handling' },
      { rank: 3, skill: 'Loss prevention + shrinkage controls' },
      { rank: 4, skill: 'Promotions + planogram compliance' },
      { rank: 5, skill: 'Customer assistance + queue management' },
      { rank: 6, skill: 'Returns + refund handling' },
    ],
    allocations: [
      { centreId: 'tc-patna',       branchName: "Spencer's, Frazer Road",     branchContactName: 'Sumit Kumar',  branchContactPhone: '+91 98••• ••681', allocated: 40, confirmed: 40, status: 'confirmed', confirmedAt: '2026-03-10' },
      { centreId: 'tc-indore',      branchName: "Spencer's, C21 Mall",        branchContactName: 'Pradeep Jain', branchContactPhone: '+91 98••• ••682', allocated: 30, confirmed: 28, status: 'confirmed', confirmedAt: '2026-03-12' },
      { centreId: 'tc-lucknow',     branchName: "Spencer's, Phoenix Mall",    branchContactName: 'Manish Tripathi',branchContactPhone:'+91 98••• ••683', allocated: 40, confirmed: 38, status: 'confirmed', confirmedAt: '2026-03-14' },
      { centreId: 'tc-bhubaneswar', branchName: "Spencer's, Esplanade Mall",  branchContactName: 'Subhash Patra', branchContactPhone:'+91 98••• ••684', allocated: 30, confirmed: 30, status: 'confirmed', confirmedAt: '2026-03-16' },
      { centreId: 'tc-ranchi',      branchName: "Spencer's, Nucleus Mall",    branchContactName: 'Sneha Mahato', branchContactPhone: '+91 98••• ••685', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-03-18' },
      { centreId: 'tc-guwahati',    branchName: "Spencer's, Christian Basti", branchContactName: 'Manoj Saikia', branchContactPhone: '+91 98••• ••686', allocated: 15, confirmed: 12, status: 'confirmed', confirmedAt: '2026-03-20' },
    ],
  },

  // ── Healthcare (second player) ──────────────────────────────────────
  {
    id: 'mou-fortis-healthcare-q3',
    employer: { name: 'Fortis Healthcare', gstin: '06AABCF0125P1Z3', sector: 'Healthcare', tone: 'emerald' },
    role: 'General Duty Assistant',
    nsqfLevel: 4,
    totalSlots: 80,
    ctcMonthly: { min: 15_500, max: 19_500 },
    signedLetterStub: 'Fortis-GDA-Q3-Demand.pdf',
    signedLetterParsedSlots: 80,
    validityFrom: '2026-04-15',
    validityUntil: '2026-09-30',
    contactPerson: { name: 'Mrs Anjali Khanna', role: 'Group Nursing Director', phone: '+91 98••• ••951', email: 'anjali.khanna@fortishealthcare.com' },
    status: 'active',
    createdAt: '2026-04-01',
    skillDemandSheet: [
      { rank: 1, skill: 'Patient hygiene + lift transfer' },
      { rank: 2, skill: 'Infection control protocols' },
      { rank: 3, skill: 'Vital-sign monitoring + EHR entry' },
      { rank: 4, skill: 'Compassionate patient communication' },
      { rank: 5, skill: 'Equipment sterilisation' },
      { rank: 6, skill: 'Emergency response — fire + medical' },
    ],
    allocations: [
      { centreId: 'tc-kolkata',     branchName: 'Fortis, Anandapur',       branchContactName: 'Dr Bishnupada Das', branchContactPhone: '+91 98••• ••961', allocated: 35, confirmed: 35, status: 'confirmed', confirmedAt: '2026-04-06' },
      { centreId: 'tc-bhubaneswar', branchName: 'Fortis, Patia',           branchContactName: 'Sister Jhilik',     branchContactPhone: '+91 98••• ••962', allocated: 25, confirmed: 25, status: 'confirmed', confirmedAt: '2026-04-08' },
      { centreId: 'tc-guwahati',    branchName: 'Fortis, Beltola',         branchContactName: 'Dr Jyoti Hazarika', branchContactPhone: '+91 98••• ••963', allocated: 20, confirmed: 14, status: 'confirmed', confirmedAt: '2026-04-10' },
    ],
  },

  // ── Expired (for the demo narrative) ────────────────────────────────
  {
    id: 'mou-bigbazaar-guwahati-expired',
    employer: { name: 'Big Bazaar (Guwahati)', gstin: '18AAACB3434R1ZS', sector: 'Retail', tone: 'amber' },
    role: 'Retail Sales Associate',
    nsqfLevel: 4,
    totalSlots: 35,
    ctcMonthly: { min: 12_500, max: 15_000 },
    signedLetterStub: 'BigBazaar-Guwahati-Q1.pdf',
    signedLetterParsedSlots: 35,
    validityFrom: '2026-01-01',
    validityUntil: '2026-03-31',
    contactPerson: { name: 'Joydeep Das', role: 'Store Manager', phone: '+91 98••• ••411', email: 'joydeep.das@futureretail.in' },
    status: 'expired',
    expiredReason: 'Validity window closed 2026-03-31. Employer did not re-confirm.',
    createdAt: '2025-12-15',
    skillDemandSheet: [
      { rank: 1, skill: 'POS billing' },
      { rank: 2, skill: 'Visual merchandising' },
      { rank: 3, skill: 'Customer greeting' },
    ],
    allocations: [
      { centreId: 'tc-guwahati', branchName: 'Big Bazaar, GS Road, Guwahati', branchContactName: 'Joydeep Das', branchContactPhone: '+91 98••• ••411', allocated: 35, confirmed:  8, status: 'expired' },
    ],
  },

  // ── Draft (for the demo narrative) ──────────────────────────────────
  {
    id: 'mou-kvic-pmvishwakarma-draft',
    employer: { name: 'Khadi & Village Industries Commission', gstin: '27AAAGK0073P1Z4', sector: 'PM Vishwakarma · Artisanal', tone: 'fuchsia' },
    role: 'Self-Employed Tailor (Cohort)',
    nsqfLevel: 3,
    totalSlots: 40,
    ctcMonthly: { min: 9_000, max: 14_000 },
    signedLetterStub: '(not uploaded yet)',
    signedLetterParsedSlots: null,
    validityFrom: '2026-06-01',
    validityUntil: '2026-11-30',
    contactPerson: { name: 'Kavita Devi', role: 'Cluster Coordinator', phone: '+91 98••• ••881', email: 'kavita.devi@kvic.gov.in' },
    status: 'draft',
    draftReason: 'Awaiting signed demand letter from KVIC. Skill demand sheet partially filled.',
    createdAt: '2026-05-08',
    skillDemandSheet: [
      { rank: 1, skill: 'Pattern drafting + cutting' },
      { rank: 2, skill: 'Sewing machine operation' },
      { rank: 3, skill: 'Finishing + quality check' },
    ],
    allocations: [
      { centreId: 'tc-jaipur', branchName: 'KVIC Cluster, Sanganer', branchContactName: '', branchContactPhone: '', allocated: 25, confirmed: 0, status: 'pending' },
      { centreId: 'tc-ranchi', branchName: 'KVIC Cluster, Jhumri',   branchContactName: '', branchContactPhone: '', allocated: 15, confirmed: 0, status: 'pending' },
    ],
  },
]

// ── Derived: rollup at the TP level ──────────────────────────────────────
export function computeTpRollup() {
  let totalSlots = 0, totalAllocated = 0, totalConfirmed = 0
  let activeMoUs = 0, expiredMoUs = 0, draftMoUs = 0
  let pendingAllocations = 0
  const employers = new Set()
  const sectors  = new Set()

  for (const mou of EMPLOYER_COMMITMENTS) {
    if (mou.status === 'active')  activeMoUs++
    if (mou.status === 'expired') expiredMoUs++
    if (mou.status === 'draft')   draftMoUs++
    if (mou.status === 'active' || mou.status === 'draft') {
      employers.add(mou.employer.name)
      sectors.add(mou.employer.sector)
    }
    for (const a of mou.allocations) {
      if (mou.status === 'expired') continue
      totalAllocated += a.allocated
      totalConfirmed += a.confirmed
      if (a.status === 'pending') pendingAllocations++
    }
    if (mou.status !== 'expired') totalSlots += mou.totalSlots
  }
  return {
    totalSlots, totalAllocated, totalConfirmed,
    handoffGap: totalAllocated - totalConfirmed,
    activeMoUs, expiredMoUs, draftMoUs,
    pendingAllocations,
    uniqueEmployers: employers.size,
    sectors: sectors.size,
  }
}

// ── Derived: per-centre demand summary ───────────────────────────────────
export function computeCentreSummary(centreId) {
  let allocated = 0, confirmed = 0, pending = 0
  const incoming = []
  for (const mou of EMPLOYER_COMMITMENTS) {
    if (mou.status === 'expired') continue
    for (const a of mou.allocations) {
      if (a.centreId !== centreId) continue
      allocated += a.allocated
      confirmed += a.confirmed
      if (a.status === 'pending') pending++
      incoming.push({ mou, allocation: a })
    }
  }
  const plannedEnrol = getPlannedTotal(centreId)
  const ratio = plannedEnrol ? (confirmed / plannedEnrol) : 0
  const allocatedRatio = plannedEnrol ? (allocated / plannedEnrol) : 0
  return { centreId, allocated, confirmed, pending, plannedEnrol, ratio, allocatedRatio, incoming }
}

export function allCentreSummaries() {
  return CENTRES.map(c => ({ ...computeCentreSummary(c.id), centre: c }))
}

// ── Per-role distribution of slot supply at a centre ──────────────────────
// Groups all employer allocations at this centre by the MoU role. Each row
// also lists which employers contribute, with the per-employer breakdown.
export function centreAllocationByRole(centreId) {
  const map = new Map() // role -> { role, sector, allocated, confirmed, employers: [] }
  for (const mou of EMPLOYER_COMMITMENTS) {
    if (mou.status === 'expired') continue
    for (const a of mou.allocations) {
      if (a.centreId !== centreId) continue
      const key = mou.role
      if (!map.has(key)) map.set(key, {
        role: mou.role,
        sector: mou.employer.sector,
        allocated: 0,
        confirmed: 0,
        employers: [],
      })
      const row = map.get(key)
      row.allocated += a.allocated
      row.confirmed += a.confirmed
      row.employers.push({
        name: mou.employer.name,
        branch: a.branchName,
        allocated: a.allocated,
        confirmed: a.confirmed,
        status: a.status,
        mouStatus: mou.status,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.allocated - a.allocated)
}

// ── Alignment view: per-track planned vs. supply ──────────────────────────
// Joins planned-enrolment tracks with their matching allocation rollups.
// Returns one row per track with: planned seats, allocated, confirmed,
// per-track ratio, and a status band. Tracks with no supply are surfaced
// explicitly so gaps are visible.
export function centreDemandAlignment(centreId) {
  const planned = getPlannedTracks(centreId)
  const supplyByRole = new Map(centreAllocationByRole(centreId).map(r => [r.role, r]))
  const rows = planned.map(p => {
    const supply = supplyByRole.get(p.role)
    const allocated = supply?.allocated || 0
    const confirmed = supply?.confirmed || 0
    const ratio = p.seats ? confirmed / p.seats : 0
    return {
      role: p.role,
      sector: p.sector,
      planned: p.seats,
      allocated,
      confirmed,
      ratio,
      employers: supply?.employers || [],
      band: ratioBand(ratio),
    }
  })
  // Surface unaligned supply: any role we have allocations for that is NOT
  // in the planned-tracks list (means HQ allocated to a track this centre
  // isn't running — wasted demand or a planning gap).
  for (const [role, supply] of supplyByRole.entries()) {
    if (rows.find(r => r.role === role)) continue
    rows.push({
      role,
      sector: supply.sector,
      planned: 0,
      allocated: supply.allocated,
      confirmed: supply.confirmed,
      ratio: 0,
      employers: supply.employers,
      band: { tone: 'amber', label: 'Unplanned track', short: 'No plan' },
      unplanned: true,
    })
  }
  return rows
}

// Health bands used by both canvases.
export function ratioBand(ratio) {
  if (ratio >= 1.5) return { tone: 'emerald', label: 'Strong',          short: '≥ 1.5×' }
  if (ratio >= 1.0) return { tone: 'sky',     label: 'On target',       short: '≥ 1.0×' }
  if (ratio >= 0.5) return { tone: 'amber',   label: 'Below target',    short: '0.5–1.0×' }
  return                     { tone: 'rose',   label: 'Red — block batch', short: '< 0.5×' }
}

export { CENTRES, TP_ROLLUP }

// ── Centre-secured demand (bottom-up logging) ────────────────────────────
//
// A centre head may sign a local employer directly — a Patna hospital that
// wants 5 GDAs, a local mall that wants 10 retail associates. These records
// are logged by the TC and then surface on TP HQ's Demand Master for review,
// where HQ can incorporate them into the national register.
//
// Stored in localStorage for now (will move to API in next iteration).

const CENTRE_SECURED_KEY = 'ksk:demand:centre-secured'

export function readCentreSecured() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(CENTRE_SECURED_KEY) || '[]')
  } catch { return [] }
}

export function writeCentreSecured(rows) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CENTRE_SECURED_KEY, JSON.stringify(rows))
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function addCentreSecured(commitment) {
  const rows = readCentreSecured()
  const next = [
    { ...commitment, id: `local-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), status: 'pending_hq_review' },
    ...rows,
  ]
  writeCentreSecured(next)
  return next[0]
}

export function updateCentreSecuredStatus(id, status, note) {
  const rows = readCentreSecured()
  const next = rows.map(r => r.id === id ? { ...r, status, statusNote: note, reviewedAt: new Date().toISOString().slice(0, 10) } : r)
  writeCentreSecured(next)
  return next
}

// Centre-originated commitments awaiting HQ review (TP-side queue).
export function pendingHqReview() {
  return readCentreSecured().filter(r => r.status === 'pending_hq_review')
}

// ── TP-originated MoUs added at runtime (Add MoU flow) ───────────────────
//
// These are net-new national MoUs created by the TP user through the "Add
// MoU" modal. They get blended into the EMPLOYER_COMMITMENTS array via the
// `getAllMous()` helper so the rest of the canvas reads from a unified list.

const TP_ADDED_KEY = 'ksk:demand:tp-added-mous'

export function readTpAddedMous() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(TP_ADDED_KEY) || '[]')
  } catch { return [] }
}

export function writeTpAddedMous(rows) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TP_ADDED_KEY, JSON.stringify(rows))
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function addTpMou(mou) {
  const rows = readTpAddedMous()
  const id = `mou-tp-${Date.now()}`
  const next = [
    { ...mou, id, createdAt: new Date().toISOString().slice(0, 10) },
    ...rows,
  ]
  writeTpAddedMous(next)
  return next[0]
}

export function updateMouSkillSheet(mouId, skillDemandSheet) {
  // Skill demand sheets on existing fixture MoUs are persisted to a small
  // override map in localStorage; on TP-added MoUs we update the row in place.
  if (mouId.startsWith('mou-tp-')) {
    const rows = readTpAddedMous()
    const next = rows.map(r => r.id === mouId ? { ...r, skillDemandSheet } : r)
    writeTpAddedMous(next)
    return
  }
  const overrideKey = 'ksk:demand:skill-overrides'
  try {
    const cur = JSON.parse(window.localStorage.getItem(overrideKey) || '{}')
    cur[mouId] = skillDemandSheet
    window.localStorage.setItem(overrideKey, JSON.stringify(cur))
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function readSkillOverrides() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem('ksk:demand:skill-overrides') || '{}')
  } catch { return {} }
}

// Returns the combined list of fixture MoUs + TP-added MoUs with any
// skill-sheet overrides applied.
export function getAllMous() {
  const overrides = readSkillOverrides()
  const base = EMPLOYER_COMMITMENTS.map(m =>
    overrides[m.id] ? { ...m, skillDemandSheet: overrides[m.id] } : m
  )
  return [...readTpAddedMous(), ...base]
}

// ── Branch WhatsApp ping log (per-allocation simulated WhatsApp state) ───
//
// Mocks SwiftChat's WhatsApp-style one-tap employer confirmation: we
// simulate a ping going out to the branch contact, the response coming
// back, and the resulting confirmed slot count.

const WHATSAPP_KEY = 'ksk:demand:whatsapp-pings'

export function readPings() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(WHATSAPP_KEY) || '{}')
  } catch { return {} }
}

export function writePings(map) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WHATSAPP_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent('ksk:demand-changed'))
  } catch {}
}

export function setPing(allocationKey, state) {
  const map = readPings()
  map[allocationKey] = { ...(map[allocationKey] || {}), ...state }
  writePings(map)
  return map[allocationKey]
}
