// aiCredits — the learner's earnable in-platform currency.
//
// Award rules (defaults — single source of truth for both the engine and the
// "How to earn" panel users see in the UI). Persisted to localStorage so it
// survives reloads; eventually swap for a /api/credits server ledger.
//
// Earn:
//   declare any action (signup, save profile)        +10
//   approve a TP-declared enrollment / placement     +50
//   verify retention check-in (Day 30 / 60 / 90)     +30
//   upload a salary slip / appointment letter        +25
//   finish a learning module / quiz                  +20
//   raise / resolve a grievance                      +20
//   maintain a monthly streak (12 months in a row)   +100 bonus
//
// Spend (suggestive — actual spend logic lives where the feature is used):
//   AI resume build                                  -50
//   Career-counsellor deep dive (50 voice min)       -75
//   Mock-interview full session + scorecard          -40
//   Discover Courses NQR live re-fetch               -10
//
// Default starting balance: 100 (so a fresh learner can play with one
// AI feature before having to earn).

const STORAGE_KEY = (userId) => `ksk.credits.v1.${userId || 'anon'}`
const DEFAULT_BALANCE = 100

// Earn rules — keep label + reason short, used in the UI to explain awards.
export const EARN_RULES = {
  signup:                 { amount: 10,  label: 'Sign-up' },
  save_profile:           { amount: 10,  label: 'Profile saved' },
  approve_enrollment:     { amount: 50,  label: 'Enrollment confirmed' },
  approve_placement:      { amount: 50,  label: 'Placement confirmed' },
  retention_day30:        { amount: 30,  label: 'Day-30 retention check' },
  retention_day60:        { amount: 30,  label: 'Day-60 retention check' },
  retention_day90:        { amount: 30,  label: 'Day-90 retention check' },
  upload_payslip:         { amount: 25,  label: 'Payslip uploaded' },
  upload_appointment:     { amount: 25,  label: 'Appointment letter uploaded' },
  finish_module:          { amount: 20,  label: 'Learning module completed' },
  pass_quiz:              { amount: 20,  label: 'Quiz passed' },
  raise_grievance:        { amount: 10,  label: 'Grievance raised' },
  resolve_grievance:      { amount: 20,  label: 'Grievance resolved' },
  monthly_streak:         { amount: 100, label: '12-month upload streak' },
}

export const SPEND_RULES = {
  resume_build:           { amount: -50, label: 'AI resume builder' },
  career_voice_deep_dive: { amount: -75, label: 'Career counsellor 50-min voice' },
  mock_interview_full:    { amount: -40, label: 'Full mock interview + scorecard' },
  nqr_live_refresh:       { amount: -10, label: 'Live NQR re-fetch' },
}

// Read state. Auto-init if missing.
export function loadCredits(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    if (raw) return JSON.parse(raw)
  } catch {}
  const init = { balance: DEFAULT_BALANCE, ledger: [{ at: Date.now(), reason: 'starter_credits', label: 'Starter credits', amount: DEFAULT_BALANCE }] }
  try { localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(init)) } catch {}
  return init
}

function save(userId, state) { try { localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(state)) } catch {} }

// Apply a credit event. Returns the new state. `kind` is either an EARN_RULES
// key or a SPEND_RULES key. If the kind has been awarded once already with
// uniqueId set, we skip (idempotent — useful for "approve_placement" so it
// can only be awarded once per placement).
export function applyCredit(userId, kind, { uniqueId, amountOverride } = {}) {
  const rule = EARN_RULES[kind] || SPEND_RULES[kind]
  if (!rule) {
    console.warn('[credits] unknown kind:', kind)
    return loadCredits(userId)
  }
  const state = loadCredits(userId)
  if (uniqueId) {
    const dupKey = `${kind}:${uniqueId}`
    if (state.ledger.some(e => e._dedupe === dupKey)) return state
  }
  const amount = amountOverride ?? rule.amount
  const entry = { at: Date.now(), reason: kind, label: rule.label, amount }
  if (uniqueId) entry._dedupe = `${kind}:${uniqueId}`
  const next = { balance: state.balance + amount, ledger: [entry, ...state.ledger].slice(0, 200) }
  save(userId, next)
  // Fire a custom event so any mounted UI listening can re-read.
  try { window.dispatchEvent(new CustomEvent('ksk:credits', { detail: next })) } catch {}
  return next
}
