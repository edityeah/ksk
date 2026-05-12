// KSK roles — mirrors the SwiftChat v3 pattern: labels, scopes, bots, suggestions,
// canvases, permissions. 10 roles total.

export const ROLE_LABELS = {
  trainee:           'Trainee',
  trainer:           'Trainer',
  training_centre:   'Training Centre',
  training_partner:  'Training Partner',
  assessor:          'Assessor',
  ssc:               'Sector Skills Council',
  employer:          'Employer',
  nsdc_officer:      'NSDC Officer',
  funder:            'Funder',
  stipend_officer:   'Stipend Officer',
}

export const ROLE_SCOPES = {
  trainee:           'Self',
  trainer:           'Own batch',
  training_centre:   'Centre',
  training_partner:  'Multi-centre',
  assessor:          'Sector / Job role',
  ssc:               'Sector (accreditation)',
  employer:          'Own hires',
  nsdc_officer:      'National',
  funder:            'Verified outcomes',
  stipend_officer:   'National payments',
}

export const ROLE_HOME_LAYOUT = {
  // 'mobile' = letter-boxed mobile-frame (chat-first)
  // 'desktop' = full-width with chat sidebar + canvas on right
  trainee:           'mobile',
  trainer:           'mobile',
  employer:          'mobile',
  training_centre:   'desktop',
  training_partner:  'desktop',
  assessor:          'desktop',
  ssc:               'desktop',
  nsdc_officer:      'desktop',
  funder:            'desktop',
  stipend_officer:   'desktop',
}

export const ROLE_BOTS = {
  trainee: [
    { id: 'swifty',          name: 'Swifty', sub: 'Your skilling companion', icon: '✨' },
    { id: 'skill_passport',  name: 'Skill Passport', sub: 'Verified credentials', icon: '🪪' },
    { id: 'career',          name: 'Career Counsellor', sub: 'Find your path', icon: '🧭' },
    { id: 'learn',           name: 'Learning Assistant', sub: 'AI tutor', icon: '📚' },
    { id: 'mock_interview',  name: 'Mock Interview', sub: 'Practice for jobs', icon: '🎤' },
    { id: 'jobs',            name: 'Jobs', sub: 'Apply in one tap', icon: '💼' },
  ],
  trainer: [
    { id: 'swifty',     name: 'Swifty', sub: 'Trainer companion', icon: '✨' },
    { id: 'attendance', name: 'Attendance', sub: 'Today\'s batch', icon: '🗓️' },
    { id: 'lesson',     name: 'Lesson Plan', sub: 'Today\'s class', icon: '📝' },
    { id: 'at_risk',    name: 'At-Risk', sub: 'Trainees to follow up', icon: '⚠️' },
  ],
  training_centre: [
    { id: 'swifty',      name: 'Swifty', sub: 'Centre overview', icon: '✨' },
    { id: 'dashboard',   name: 'Centre Dashboard', sub: 'KPIs', icon: '📊' },
    { id: 'batches',     name: 'Batches', sub: 'Active + planned', icon: '📚' },
    { id: 'cert_pipe',   name: 'Certification Pipeline', sub: 'Trainees → certs', icon: '🎓' },
    { id: 'inspection',  name: 'Inspection Readiness', sub: 'Self-check', icon: '🔍' },
  ],
  training_partner: [
    { id: 'swifty',     name: 'Swifty', sub: 'TP overview', icon: '✨' },
    { id: 'rollup',     name: 'Multi-centre Rollup', sub: 'All your centres', icon: '🏢' },
    { id: 'tracks',     name: 'Track Designer', sub: 'Build training paths', icon: '🧩' },
    { id: 'placement',  name: 'Placements', sub: 'Declare + track', icon: '🤝' },
    { id: 'quality',    name: 'Quality Index', sub: 'Centre health', icon: '🏆' },
  ],
  assessor: [
    { id: 'swifty', name: 'Swifty', sub: 'Assessor companion', icon: '✨' },
    { id: 'queue',  name: 'Assessment Queue', sub: 'Today + upcoming', icon: '🧾' },
    { id: 'live',   name: 'Live Assessment', sub: 'Capture in real time', icon: '🎬' },
  ],
  ssc: [
    { id: 'swifty',     name: 'Swifty', sub: 'SSC console', icon: '✨' },
    { id: 'accred',     name: 'Accreditation Queue', sub: 'Pending applications', icon: '📜' },
    { id: 'standards',  name: 'Standards Library', sub: 'QPs + competencies', icon: '📐' },
    { id: 'outcomes',   name: 'Sector Outcomes', sub: 'Your sector', icon: '🎯' },
  ],
  employer: [
    { id: 'swifty',     name: 'Swifty', sub: 'Employer companion', icon: '✨' },
    { id: 'confirm',    name: 'Confirm Hire', sub: 'Pending confirmations', icon: '✅' },
    { id: 'retention',  name: 'Day-90 Retention', sub: 'Confirm continued employment', icon: '📅' },
    { id: 'my_hires',   name: 'My Hires', sub: 'Trainees I\'ve hired', icon: '👥' },
    { id: 'post_job',   name: 'Post a Job', sub: 'Hire from KSK', icon: '➕' },
  ],
  nsdc_officer: [
    { id: 'swifty',     name: 'Swifty', sub: 'Command centre', icon: '✨' },
    { id: 'overview',   name: 'National Overview', sub: 'KPIs + map', icon: '🇮🇳' },
    { id: 'cert',       name: 'Certification', sub: 'Pipeline + delays', icon: '🎓' },
    { id: 'placement',  name: 'Placement', sub: 'Funnel + verification', icon: '🤝' },
    { id: 'retention',  name: 'Retention', sub: 'Cohorts + risk', icon: '🔁' },
    { id: 'schemes',    name: 'Scheme Analytics', sub: 'PMKVY / DDU-GKY / NAPS / …', icon: '📊' },
    { id: 'war_room',   name: 'War Room', sub: 'Anomalies + alerts', icon: '🚨' },
    { id: 'broadcast',  name: 'Broadcast', sub: 'Targeted message', icon: '📣' },
  ],
  funder: [
    { id: 'swifty',     name: 'Swifty', sub: 'Outcomes view', icon: '✨' },
    { id: 'outcomes',   name: 'Verified Outcomes', sub: 'By scheme + state', icon: '✅' },
    { id: 'money',      name: 'Money vs Outcomes', sub: 'Disbursal alignment', icon: '💰' },
    { id: 'indep_ver',  name: 'Independent Verification', sub: 'Audit trail', icon: '🛡️' },
  ],
  stipend_officer: [
    { id: 'swifty', name: 'Swifty', sub: 'Disbursal console', icon: '✨' },
    { id: 'queue',  name: 'Stipend Queue', sub: 'Pending + failed', icon: '💸' },
    { id: 'retry',  name: 'Aadhaar-Bank Retry', sub: 'Failed disbursements', icon: '🔁' },
    { id: 'utr',    name: 'UTR Confirmations', sub: 'Disbursed totals', icon: '🧾' },
  ],
}

export const ROLE_SUGGESTIONS = {
  trainee: [
    'Show my Skill Passport',
    'Find courses near me',
    'I just joined a new job — confirm it',
    'Has my stipend been disbursed?',
    'Prepare me for a retail interview',
  ],
  trainer: [
    'Mark today\'s attendance',
    'Show at-risk trainees',
    'Create a quiz for tomorrow',
    'Today\'s lesson plan',
  ],
  training_centre: [
    'Show me my centre dashboard',
    'Which batches need attention?',
    'Pending certifications this month',
    'Declare a new placement',
  ],
  training_partner: [
    'Multi-centre roll-up',
    'Outcome trend across all centres',
    'Design a new track',
    'Pending placements awaiting verification',
  ],
  assessor: [
    'Show today\'s assessments',
    'Start a live assessment',
    'Submit a result',
  ],
  ssc: [
    'Pending accreditation applications',
    'Show sector-wide outcomes',
    'Standards library — Retail',
  ],
  employer: [
    'Confirm pending hires',
    'Show my Day-90 retention check-ins',
    'Post a new job',
  ],
  nsdc_officer: [
    'Show India heat-map',
    'PMKVY vs DDU-GKY outcomes',
    'Why is retention low in Logistics?',
    'Send broadcast to all training partners',
    'War room — placement anomalies',
  ],
  funder: [
    'Verified outcomes by scheme',
    'Money disbursed against verified outcomes',
    'Independent verification audit',
  ],
  stipend_officer: [
    'Failed disbursements last month',
    'Retry Aadhaar-bank failures',
    'UTR confirmations summary',
  ],
}

export const ROLE_CANVASES = {
  trainee: ['skill_passport', 'course_discovery', 'career_counsellor', 'learning_assistant', 'oral_assessment', 'ocr_exam', 'mock_interview', 'jobs_marketplace', 'placement_confirm', 'retention_checkin', 'salary_slip', 'stipend_status', 'grievance', 'notifications'],
  trainer: ['attendance', 'lesson_delivery', 'quiz', 'at_risk', 'notifications'],
  training_centre: ['centre_dashboard', 'batches', 'cert_pipeline', 'placement_declare', 'inspection', 'at_risk', 'notifications'],
  training_partner: ['tp_rollup', 'track_designer', 'scheme_allocation', 'placement_declare', 'quality_index', 'batches', 'at_risk', 'cert_pipeline', 'notifications'],
  assessor: ['assessment_queue', 'live_assessment', 'notifications'],
  ssc: ['accreditation', 'standards', 'sector_outcomes', 'broadcast', 'notifications'],
  employer: ['employer_confirm', 'retention_confirm', 'my_hires', 'post_job', 'notifications'],
  nsdc_officer: ['india_heatmap', 'national_overview', 'cert_dashboard', 'placement_dashboard', 'retention_dashboard', 'scheme_analytics', 'war_room', 'broadcast', 'notifications'],
  funder: ['funder_outcomes', 'money_outcomes', 'scheme_analytics', 'notifications'],
  stipend_officer: ['stipend_queue', 'stipend_retry', 'notifications'],
}

export const NOTIFICATION_PERMISSIONS = {
  trainee:           { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
  trainer:           { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
  training_centre:   { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
  training_partner:  { canCreateBroadcast: true,  canCreateReminder: true,  canViewNotifications: true },
  assessor:          { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
  ssc:               { canCreateBroadcast: true,  canCreateReminder: true,  canViewNotifications: true },
  employer:          { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
  nsdc_officer:      { canCreateBroadcast: true,  canCreateReminder: true,  canViewNotifications: true },
  funder:            { canCreateBroadcast: false, canCreateReminder: false, canViewNotifications: true },
  stipend_officer:   { canCreateBroadcast: false, canCreateReminder: true,  canViewNotifications: true },
}

export function defaultBotsFor(role) { return ROLE_BOTS[role] || [] }
export function suggestionsFor(role) { return ROLE_SUGGESTIONS[role] || [] }
export function canvasesFor(role)    { return ROLE_CANVASES[role] || [] }
export function homeLayoutFor(role)  { return ROLE_HOME_LAYOUT[role] || 'desktop' }
