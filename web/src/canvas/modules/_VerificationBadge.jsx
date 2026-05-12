const LABELS = {
  claimed_unverified:  { text: 'Claimed · Unverified',     css: 'badge-warn' },
  partially_verified:  { text: 'Partially Verified',       css: 'badge-info' },
  verified:            { text: 'Verified',                  css: 'badge-ok' },
  conflicted:          { text: 'Conflicted',                css: 'badge-danger' },
  disputed:            { text: 'Disputed · Payment Blocked', css: 'badge-danger' },
  dual_confirmed:      { text: 'Verified',                  css: 'badge-ok' },
  trainee_only:        { text: 'Trainee Confirmed',         css: 'badge-info' },
  employer_only:       { text: 'Employer Confirmed',        css: 'badge-info' },
  pending:             { text: 'Pending',                   css: 'badge-info' },
  flagged:             { text: 'Flagged',                   css: 'badge-flag' },
}

export default function VerificationBadge({ state }) {
  const m = LABELS[state] || { text: state, css: 'badge-info' }
  return <span className={`badge ${m.css}`}>{m.text}</span>
}
