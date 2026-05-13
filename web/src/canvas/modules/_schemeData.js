// Per-scheme cross-cut fixtures used by Enrollments / Placement / Retention
// canvases. Numbers are illustrative — replicating the public-portal scale
// proportions so a demo with the funder feels real. Replace with /api/schemes
// when the real data mart is wired.

export const SCHEME_ENROLLMENT = {
  pmkvy:          { enrolled: 1_320_000, trained: 1_110_000, certified:   720_000, placed: 280_000 },
  ddu_gky:        { enrolled:   480_000, trained:   430_000, certified:   312_000, placed: 218_000 },
  naps:           { enrolled:   510_000, trained:   485_000, certified:   180_000, placed: 130_000 },
  pm_vishwakarma: { enrolled:   142_000, trained:    91_000, certified:    54_000, placed:  16_000 },
  sib:            { enrolled:    63_000, trained:    58_000, certified:    52_000, placed:  47_000 },
  rpl:            { enrolled:   220_000, trained:    20_000, certified:    18_000, placed:   2_500 },
  pmnap:          { enrolled:    35_000, trained:    32_000, certified:    11_000, placed:   8_500 },
  skill_hub:      { enrolled:    18_000, trained:    16_000, certified:     9_000, placed:   3_500 },
}

export const SCHEME_PLACEMENT_VERIFICATION = {
  // 3-signal verification status, by scheme.
  // claimed_unverified = TP declared but no other signal yet
  // partially_verified = TP + one of (learner/employer)
  // verified           = all three (or external-verified)
  // disputed           = learner said no
  // conflicted         = employer said no
  pmkvy:          { claimed_unverified: 38_000, partially_verified: 142_000, verified:  92_000, disputed: 5_400, conflicted: 2_600 },
  ddu_gky:        { claimed_unverified:  9_500, partially_verified:  74_000, verified: 128_000, disputed: 4_200, conflicted: 2_300 },
  naps:           { claimed_unverified: 18_000, partially_verified:  62_000, verified:  47_000, disputed: 2_400, conflicted: 600 },
  pm_vishwakarma: { claimed_unverified:  4_200, partially_verified:   8_400, verified:   3_200, disputed:   150, conflicted: 50 },
  sib:            { claimed_unverified:   600,  partially_verified:   8_900, verified:  37_000, disputed:   120, conflicted: 380 },
  rpl:            { claimed_unverified:   320,  partially_verified:   1_400, verified:     760, disputed:    20, conflicted: 0 },
  pmnap:          { claimed_unverified:   480,  partially_verified:   3_200, verified:   4_800, disputed:   30,  conflicted: 0 },
  skill_hub:      { claimed_unverified:   190,  partially_verified:   1_500, verified:   1_800, disputed:   10,  conflicted: 0 },
}

export const SCHEME_RETENTION = {
  // Retention check-in completion rates at each milestone.
  // Counts are "placements eligible to be checked" (i.e. placed cohort).
  pmkvy:          { placed: 280_000, day30: { completed: 218_000, retained: 198_000 }, day60: { completed: 165_000, retained: 142_000 }, day90: { completed: 132_000, retained: 109_000 } },
  ddu_gky:        { placed: 218_000, day30: { completed: 198_000, retained: 188_000 }, day60: { completed: 175_000, retained: 159_000 }, day90: { completed: 151_000, retained: 132_000 } },
  naps:           { placed: 130_000, day30: { completed:  95_000, retained:  86_000 }, day60: { completed:  72_000, retained:  61_000 }, day90: { completed:  58_000, retained:  48_000 } },
  pm_vishwakarma: { placed:  16_000, day30: { completed:  11_500, retained:   9_800 }, day60: { completed:   7_400, retained:   5_600 }, day90: { completed:   4_200, retained:   2_800 } },
  sib:            { placed:  47_000, day30: { completed:  46_200, retained:  44_800 }, day60: { completed:  44_500, retained:  42_100 }, day90: { completed:  42_800, retained:  40_300 } },
  rpl:            { placed:   2_500, day30: { completed:   1_200, retained:   1_050 }, day60: { completed:     820, retained:     680 }, day90: { completed:     480, retained:     390 } },
  pmnap:          { placed:   8_500, day30: { completed:   7_100, retained:   6_400 }, day60: { completed:   5_900, retained:   4_800 }, day90: { completed:   4_700, retained:   3_700 } },
  skill_hub:      { placed:   3_500, day30: { completed:   2_800, retained:   2_400 }, day60: { completed:   2_100, retained:   1_650 }, day90: { completed:   1_400, retained:     980 } },
}

// Aggregated "All schemes" view computed once at import time.
function sum(field, src) {
  return Object.values(src).reduce((acc, row) => acc + (row[field] || 0), 0)
}

SCHEME_ENROLLMENT.all = {
  enrolled:  sum('enrolled',  SCHEME_ENROLLMENT),
  trained:   sum('trained',   SCHEME_ENROLLMENT),
  certified: sum('certified', SCHEME_ENROLLMENT),
  placed:    sum('placed',    SCHEME_ENROLLMENT),
}

SCHEME_PLACEMENT_VERIFICATION.all = {
  claimed_unverified: sum('claimed_unverified', SCHEME_PLACEMENT_VERIFICATION),
  partially_verified: sum('partially_verified', SCHEME_PLACEMENT_VERIFICATION),
  verified:           sum('verified',           SCHEME_PLACEMENT_VERIFICATION),
  disputed:           sum('disputed',           SCHEME_PLACEMENT_VERIFICATION),
  conflicted:         sum('conflicted',         SCHEME_PLACEMENT_VERIFICATION),
}

SCHEME_RETENTION.all = (() => {
  let placed = 0
  const buckets = { day30: { completed: 0, retained: 0 }, day60: { completed: 0, retained: 0 }, day90: { completed: 0, retained: 0 } }
  for (const v of Object.values(SCHEME_RETENTION)) {
    placed += v.placed
    for (const k of ['day30','day60','day90']) {
      buckets[k].completed += v[k].completed
      buckets[k].retained  += v[k].retained
    }
  }
  return { placed, ...buckets }
})()
