// Demo SIDH credentials per role for local / staging environments.
//
// These are the seeded users in server/src/seed/seed.js that have a sidhId +
// passwordHash, i.e. the ones that can actually log in. Used by:
//   • SidhRedirectPage      → prefill the form when the user picks a role
//   • RoleSwitcher (TopBar / ProfilePill) → switch roles without logging out
//
// Roles seeded without a sidhId (a second TP, second employer, funder,
// stipend_officer) are intentionally omitted — they exist in the DB for
// fixture richness but can't authenticate yet. Add seed entries with
// sidhId + passwordHash when we want to expose them via the switcher.
//
// All accounts share the same password: Demo@123

export const DEMO_PASSWORD = 'Demo@123'

export const DEMO_USERS = {
  trainee:          { sidhId: 'LRN-RANI-001',   name: 'Rani Kumari',          contextLabel: 'Learner · Patna' },
  trainer:          { sidhId: 'TRN-MB-1001',    name: 'Suresh Patel',         contextLabel: 'Trainer · Magic Bus' },
  training_centre:  { sidhId: 'TC-PAT-001',     name: 'Sunita Devi',          contextLabel: 'Centre Head · Magic Bus Patna' },
  training_partner: { sidhId: 'TP-MB-001',      name: 'Priya Kohli',          contextLabel: 'HQ · Magic Bus India Foundation' },
  assessor:         { sidhId: 'ASR-RAS-001',    name: 'Lakshmi Ramaswamy',    contextLabel: 'Assessor · RASCI' },
  ssc:              { sidhId: 'SSC-RASCI-001',  name: 'Rohit Bhandari',       contextLabel: 'Sector Skill Council · RASCI' },
  employer:         { sidhId: 'EST-RR-PAT-001', name: 'Reliance Retail HR',   contextLabel: 'Employer · Patna' },
  nsdc_officer:     { sidhId: 'NSDC-001',       name: 'Vrinda Sharma',        contextLabel: 'NSDC Outcomes Cell' },
  mentor:           { sidhId: 'MNT-RR-001',     name: 'Suresh Iyer',          contextLabel: 'Mentor · Reliance Retail (Retail Ops)' },
}

// Ordered list for UI rendering. Trainee first (most common demo path),
// then frontline roles, then HQ / administrative roles. Mentor sits with
// the partner cluster since the Partners tab is its home.
export const DEMO_USER_ORDER = [
  'trainee',
  'trainer',
  'training_centre',
  'training_partner',
  'mentor',
  'employer',
  'assessor',
  'ssc',
  'nsdc_officer',
]

export function getDemoUser(role) {
  return DEMO_USERS[role] || null
}
