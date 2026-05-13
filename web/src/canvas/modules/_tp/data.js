// Training Partner cross-cut fixtures.
//
// Demo TP: Magic Bus India Foundation — the seeded TP (code TP2024MB001).
// Real-world Magic Bus runs 80+ Livelihoods Centres across 22 states; we
// model 10 of them here for the funder demo. Patna and Bhubaneswar match
// the centres in server/src/seed/seed.js; the other 8 are demo expansion.
//
// All numbers are illustrative — sized so the demo with the funder feels real.

export const TP_PROFILE = {
  id: 'TP2024MB001',
  name: 'Magic Bus India Foundation',
  hq: 'Mumbai, Maharashtra',
  registeredSince: '1999',
  primarySchemes: ['PMKVY 4.0', 'DDU-GKY', 'NAPS', 'PM Vishwakarma'],
}

// ── 10 centres with realistic spread ─────────────────────────────────────
// Numbers chosen so the rollup adds up to the headline TP profile (~85K
// enrolled, ~50K placed, in line with a mid-sized national TP rollup).
export const CENTRES = [
  {
    id: 'tc-bhopal',  name: 'Bhopal Centre',  city: 'Bhopal',   state: 'Madhya Pradesh',
    tracks: ['Solar PV Installer', 'Retail Sales Associate', 'Domestic Data Entry Operator', 'Beauty Therapist'],
    schemes: ['PMKVY 4.0', 'DDU-GKY', 'NAPS'],
    enrolled: 12_400, trained: 11_200, certified: 9_800, placed: 7_600, retention90: 82, qualityIndex: 88,
    activeBatches: 18, ongoingBatches: 6, upcomingBatches: 4,
    flagged: false,
  },
  {
    id: 'tc-indore',  name: 'Indore Centre',  city: 'Indore',   state: 'Madhya Pradesh',
    tracks: ['Sewing Machine Operator', 'General Duty Assistant', 'Domestic Data Entry Operator'],
    schemes: ['PMKVY 4.0', 'DDU-GKY'],
    enrolled: 9_800,  trained: 8_900,  certified: 7_200, placed: 5_400, retention90: 76, qualityIndex: 81,
    activeBatches: 14, ongoingBatches: 4, upcomingBatches: 2,
    flagged: false,
  },
  {
    id: 'tc-patna',   name: 'Magic Bus Patna Centre',   city: 'Patna',    state: 'Bihar',
    tracks: ['Solar PV Installer', 'Field Technician (Computing & Peripherals)', 'Retail Sales Associate'],
    schemes: ['PMKVY 4.0', 'NAPS'],
    enrolled: 8_500,  trained: 7_700,  certified: 6_400, placed: 4_900, retention90: 78, qualityIndex: 83,
    activeBatches: 12, ongoingBatches: 5, upcomingBatches: 3,
    flagged: false,
  },
  {
    id: 'tc-ranchi',  name: 'Ranchi Centre',  city: 'Ranchi',   state: 'Jharkhand',
    tracks: ['Assistant Electrician', 'Welder (Gas & Electric)', 'Sewing Machine Operator'],
    schemes: ['DDU-GKY', 'PMKVY 4.0'],
    enrolled: 6_800,  trained: 6_100,  certified: 5_400, placed: 4_200, retention90: 81, qualityIndex: 85,
    activeBatches: 10, ongoingBatches: 4, upcomingBatches: 1,
    flagged: false,
  },
  {
    id: 'tc-jaipur',  name: 'Jaipur Centre',  city: 'Jaipur',   state: 'Rajasthan',
    tracks: ['Self Employed Tailor', 'Beauty Therapist', 'Customer Care Executive'],
    schemes: ['PMKVY 4.0', 'PM Vishwakarma'],
    enrolled: 7_900,  trained: 7_100,  certified: 6_000, placed: 4_300, retention90: 71, qualityIndex: 78,
    activeBatches: 11, ongoingBatches: 4, upcomingBatches: 2,
    flagged: false,
  },
  {
    id: 'tc-lucknow', name: 'Lucknow Centre', city: 'Lucknow',  state: 'Uttar Pradesh',
    tracks: ['General Housekeeper', 'Retail Sales Associate', 'Domestic Data Entry Operator'],
    schemes: ['PMKVY 4.0', 'DDU-GKY'],
    enrolled: 10_200, trained: 9_300,  certified: 7_800, placed: 5_700, retention90: 74, qualityIndex: 80,
    activeBatches: 13, ongoingBatches: 5, upcomingBatches: 3,
    flagged: false,
  },
  {
    id: 'tc-kolkata', name: 'Kolkata Centre', city: 'Kolkata',  state: 'West Bengal',
    tracks: ['Customer Care Executive', 'Computer Operator & Programming Assistant', 'Retail Trainee Associate'],
    schemes: ['PMKVY 4.0', 'NAPS'],
    enrolled: 8_100,  trained: 7_300,  certified: 6_100, placed: 4_500, retention90: 73, qualityIndex: 79,
    activeBatches: 11, ongoingBatches: 4, upcomingBatches: 2,
    flagged: false,
  },
  {
    id: 'tc-bengaluru', name: 'Bengaluru Centre', city: 'Bengaluru', state: 'Karnataka',
    tracks: ['Field Technician AC', 'Automotive Assembly Operator', 'CCBP Intensive'],
    schemes: ['PMKVY 4.0', 'NAPS'],
    enrolled: 8_900,  trained: 8_400,  certified: 7_100, placed: 5_900, retention90: 86, qualityIndex: 91,
    activeBatches: 12, ongoingBatches: 5, upcomingBatches: 4,
    flagged: false,
  },
  {
    id: 'tc-guwahati', name: 'Guwahati Centre', city: 'Guwahati', state: 'Assam',
    tracks: ['Plumber General', 'Assistant Electrician', 'Domestic Data Entry Operator'],
    schemes: ['DDU-GKY', 'PMKVY 4.0'],
    enrolled: 4_200,  trained: 3_700,  certified: 2_900, placed: 1_800, retention90: 62, qualityIndex: 68,
    activeBatches: 6,  ongoingBatches: 3,  upcomingBatches: 1,
    flagged: true,
    flagReason: 'Q3 placement rate dipped to 49% — below TP-wide 67% median',
  },
  {
    id: 'tc-bhubaneswar', name: 'Magic Bus Bhubaneswar Centre', city: 'Bhubaneswar', state: 'Odisha',
    tracks: ['Beauty Therapist', 'Customer Care Executive', 'Computer Operator'],
    schemes: ['PMKVY 4.0'],
    enrolled: 8_872,  trained: 8_100,  certified: 6_800, placed: 5_624, retention90: 80, qualityIndex: 84,
    activeBatches: 11, ongoingBatches: 4, upcomingBatches: 3,
    flagged: false,
  },
]

// Auto-derive headline rollup totals so it always matches the centres.
export const TP_ROLLUP = (() => {
  let enrolled = 0, trained = 0, certified = 0, placed = 0, qSum = 0, rSum = 0
  for (const c of CENTRES) {
    enrolled  += c.enrolled
    trained   += c.trained
    certified += c.certified
    placed    += c.placed
    qSum += c.qualityIndex
    rSum += c.retention90
  }
  return {
    enrolled, trained, certified, placed,
    avgQuality:   Math.round(qSum / CENTRES.length),
    avgRetention: Math.round(rSum / CENTRES.length),
    centres:      CENTRES.length,
    tracks:       new Set(CENTRES.flatMap(c => c.tracks)).size,
    schemes:      new Set(CENTRES.flatMap(c => c.schemes)).size,
    states:       new Set(CENTRES.map(c => c.state)).size,
    activeBatches:  CENTRES.reduce((s, c) => s + c.activeBatches,   0),
    ongoingBatches: CENTRES.reduce((s, c) => s + c.ongoingBatches,  0),
    upcomingBatches:CENTRES.reduce((s, c) => s + c.upcomingBatches, 0),
    flaggedCentres: CENTRES.filter(c => c.flagged).length,
  }
})()

// ── Track-level rollup (used in Enrollments / Cert / Placement views) ───
export const TRACKS = (() => {
  const map = new Map()
  for (const c of CENTRES) {
    for (const t of c.tracks) {
      if (!map.has(t)) map.set(t, { name: t, centres: 0, enrolled: 0, trained: 0, certified: 0, placed: 0 })
      const row = map.get(t)
      // distribute centre totals across that centre's tracks evenly (good enough for a fixture)
      const share = 1 / c.tracks.length
      row.centres   += 1
      row.enrolled  += Math.round(c.enrolled  * share)
      row.trained   += Math.round(c.trained   * share)
      row.certified += Math.round(c.certified * share)
      row.placed    += Math.round(c.placed    * share)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.enrolled - a.enrolled)
})()

// ── Scheme-level rollup ─────────────────────────────────────────────────
export const SCHEME_ROLLUP = (() => {
  const map = new Map()
  for (const c of CENTRES) {
    for (const s of c.schemes) {
      if (!map.has(s)) map.set(s, { name: s, centres: 0, enrolled: 0, placed: 0, retention90: 0, _rWeight: 0 })
      const row = map.get(s)
      const share = 1 / c.schemes.length
      row.centres++
      row.enrolled += Math.round(c.enrolled * share)
      row.placed   += Math.round(c.placed   * share)
      row.retention90 += c.retention90
      row._rWeight++
    }
  }
  for (const row of map.values()) {
    row.retention90 = Math.round(row.retention90 / Math.max(row._rWeight, 1))
    delete row._rWeight
  }
  return Array.from(map.values())
})()
