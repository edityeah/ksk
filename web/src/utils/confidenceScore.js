// confidenceScore — KSK's transparent verification model.
//
// Surfaces ONLY to NSDC Admin / Funder roles (not learner, not TP).
// Goal: turn a placement / enrollment / retention record into a single
// 0.00-1.00 number that says how trustworthy the data is — based on how
// many independent signals have confirmed it.
//
// Tier model (additive, monotonic — each signal only increases score):
//   Stage                            Δ      Cumulative
//   ────────────────────────────────────────────────────
//   TP self-declared (the maker)     0.30   0.30
//   Learner verified (the checker)   0.30   0.60
//   Document uploaded (payslip /
//     offer letter / appointment)    0.10   0.70
//   Employer confirms separately     0.10   0.80
//   EPFO / bank-statement / DigiLocker
//     externally verified            0.15   0.95
//
// Anything < 0.30  = data not even declared (red)
// 0.30 - 0.59      = self-declared only (amber, audit risk)
// 0.60 - 0.69      = 2-signal verified (sky, decent)
// 0.70 - 0.84      = 3+ signal verified (emerald, healthy)
// 0.85+            = externally verified (deep green, audit-grade)

// ── The 5 signals that can contribute to a placement's confidence ──────
export const SIGNALS = [
  { key: 'tpDeclared',        label: 'TP declared',              delta: 0.30, icon: '🟦' },
  { key: 'learnerConfirmed',  label: 'Learner confirmed',        delta: 0.30, icon: '🟩' },
  { key: 'docUploaded',       label: 'Document uploaded',        delta: 0.10, icon: '📎' },
  { key: 'employerConfirmed', label: 'Employer confirmed',       delta: 0.10, icon: '🟣' },
  { key: 'externallyVerified',label: 'EPFO / bank verified',     delta: 0.15, icon: '🔒' },
]

const MAX_SCORE = SIGNALS.reduce((s, x) => s + x.delta, 0)  // 0.95

// Compute score from a `signals` object: { tpDeclared: true, learnerConfirmed: false, … }
export function computeConfidence(signals = {}) {
  let score = 0
  for (const s of SIGNALS) {
    if (signals[s.key]) score += s.delta
  }
  // Clamp + round to 2 decimals.
  return Math.min(MAX_SCORE, Math.round(score * 100) / 100)
}

// Take a placement record (from /api/placements) and derive the signals.
// Trainee + employer confirms are real fields. Doc upload + EPFO check are
// inferred from related records (payslips, retention checks) — fall back to
// false when the data isn't surfaced.
export function signalsFromPlacement(p = {}) {
  return {
    tpDeclared:         !!p.tpDeclaredAt,
    learnerConfirmed:   !!p.traineeConfirmedAt,
    docUploaded:        !!p.salarySlipsCount || (Array.isArray(p.salarySlips) && p.salarySlips.length > 0),
    employerConfirmed:  !!p.employerConfirmedAt,
    externallyVerified: !!p.epfoVerified || !!p.bankVerified,
  }
}

// Convenience: full result with score + tier + which signals fired.
export function confidenceFor(placementLike) {
  const signals = signalsFromPlacement(placementLike)
  const score = computeConfidence(signals)
  return { score, signals, tier: tierFor(score), label: labelFor(score) }
}

export function tierFor(score) {
  if (score >= 0.85) return 'external'
  if (score >= 0.70) return 'healthy'
  if (score >= 0.60) return 'decent'
  if (score >= 0.30) return 'self_only'
  return 'no_declaration'
}

export function labelFor(score) {
  if (score >= 0.85) return 'External-verified'
  if (score >= 0.70) return '3-signal verified'
  if (score >= 0.60) return '2-signal verified'
  if (score >= 0.30) return 'Self-declared only'
  return 'No declaration'
}

// Tone (Tailwind class) for the score pill — keep consistent across the app.
export function toneFor(score) {
  if (score >= 0.85) return { bg: 'bg-emerald-100',  text: 'text-emerald-800', ring: 'ring-emerald-400' }
  if (score >= 0.70) return { bg: 'bg-emerald-50',   text: 'text-emerald-700', ring: 'ring-emerald-300' }
  if (score >= 0.60) return { bg: 'bg-sky-50',       text: 'text-sky-700',     ring: 'ring-sky-300' }
  if (score >= 0.30) return { bg: 'bg-amber-50',     text: 'text-amber-700',   ring: 'ring-amber-300' }
  return                  { bg: 'bg-rose-50',        text: 'text-rose-700',    ring: 'ring-rose-300' }
}

// Aggregate confidence across many placements — useful for "average TP
// confidence" rollups on the NSDC Training Partners dashboard.
export function averageConfidence(placementLikes = []) {
  if (placementLikes.length === 0) return 0
  const sum = placementLikes.reduce((acc, p) => acc + confidenceFor(p).score, 0)
  return Math.round((sum / placementLikes.length) * 100) / 100
}
