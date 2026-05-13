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

// Each bot defines:
//   id, name, sub (short label), desc (2-line description for the OPEN AN APP card),
//   icon (emoji or lucide name), tone (pastel colour token), canvas (canvas type
//   to open on direct tap — bypasses NLP)

export const ROLE_BOTS = {
  trainee: [
    { id: 'skill_passport',  name: 'Skill Passport',    desc: 'Verifiable digital resume + QR for employers',          icon: '🪪', tone: 'sky',     canvas: 'skill_passport' },
    { id: 'discover',        name: 'Discover Courses',  desc: 'Browse skilling courses, ITIs and Skill Centres',       icon: '🧭', tone: 'indigo',  canvas: 'course_discovery' },
    { id: 'career',          name: 'Career Counsellor', desc: 'AI guidance on roles, salary ranges and pathways',      icon: '🎯', tone: 'fuchsia', canvas: 'career_counsellor' },
    { id: 'learn',           name: 'Learning Assistant',desc: 'AI tutor for course prep and revision',                 icon: '📚', tone: 'emerald', canvas: 'learning_assistant' },
    { id: 'mock_interview',  name: 'Mock Interview',    desc: 'Practice interviews + HR simulations',                  icon: '🎤', tone: 'rose',    canvas: 'mock_interview' },
    { id: 'oral',            name: 'Oral Assessment',   desc: 'Voice-based competency assessment',                     icon: '🗣️', tone: 'orange',  canvas: 'oral_assessment' },
    { id: 'jobs',            name: 'Find Jobs',         desc: 'Verified jobs near you, apply with Skill Passport',     icon: '💼', tone: 'teal',    canvas: 'jobs_marketplace' },
    { id: 'placement',       name: 'Confirm Placement', desc: 'Confirm a placement declared by your training partner', icon: '🤝', tone: 'violet',  canvas: 'placement_confirm' },
    { id: 'retention',       name: 'Retention Check-in',desc: 'Day 30/60/90 retention confirmation',                   icon: '📅', tone: 'cyan',    canvas: 'retention_checkin' },
    { id: 'payslip',         name: 'Upload Payslip',    desc: 'OCR-verified salary slips → DigiLocker',                icon: '🧾', tone: 'lime',    canvas: 'salary_slip' },
    { id: 'stipend',         name: 'Stipend Status',    desc: 'NAPS / DBT stipend disbursals + UTR',                   icon: '💸', tone: 'pink',    canvas: 'stipend_status' },
    { id: 'certs',           name: 'My Certificates',   desc: 'NSQF certifications stored in DigiLocker',              icon: '🏅', tone: 'amber',   canvas: 'skill_passport' },
    { id: 'updates',         name: 'Updates & Alerts',  desc: 'Scheme announcements, deadlines, reminders',            icon: '🔔', tone: 'indigo',  canvas: 'notifications' },
    { id: 'grievance',       name: 'Grievance',         desc: 'File and track grievances with NSDC',                   icon: '🆘', tone: 'rose',    canvas: 'grievance' },
    { id: 'profile',         name: 'My Profile',        desc: 'Aadhaar, APAAR, DigiLocker links and KYC',              icon: '👤', tone: 'sky',     canvas: 'skill_passport' },
  ],
  trainer: [
    { id: 'attendance', name: 'Mark Attendance',    desc: 'Today\'s batch attendance with maker-checker',        icon: '🗓️', tone: 'amber',   canvas: 'attendance' },
    { id: 'lesson',     name: 'Today\'s Lesson',    desc: 'Lesson plan, materials, learning outcomes',           icon: '📝', tone: 'indigo',  canvas: 'lesson_delivery' },
    { id: 'quiz',       name: 'Quiz Builder',       desc: 'Create a quick quiz for your batch',                  icon: '❓', tone: 'fuchsia', canvas: 'quiz' },
    { id: 'at_risk',    name: 'At-Risk Trainees',   desc: 'Trainees by attendance, scores and retention risk',   icon: '⚠️', tone: 'rose',    canvas: 'at_risk' },
    { id: 'batches',    name: 'My Batches',         desc: 'Active + planned batches and rosters',                icon: '📚', tone: 'emerald', canvas: 'batches' },
    { id: 'curriculum', name: 'Curriculum',         desc: 'Job-role QPs, NOS modules, training content',         icon: '📖', tone: 'teal',    canvas: 'lesson_delivery' },
    { id: 'assess_help',name: 'Assessment Prep',    desc: 'Prep your batch for the upcoming assessment',         icon: '🎓', tone: 'sky',     canvas: 'at_risk' },
    { id: 'parent',     name: 'Parent Outreach',    desc: 'Send updates to parents of school-leaver trainees',   icon: '👨‍👩‍👦', tone: 'violet', canvas: 'notifications' },
    { id: 'updates',    name: 'Updates & Alerts',   desc: 'Scheme changes, broadcasts, reminders',               icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  training_centre: [
    { id: 'dashboard',   name: 'Centre Dashboard',     desc: 'Live KPIs: enrolment, attendance, certs, placement', icon: '📊', tone: 'indigo',  canvas: 'centre_dashboard' },
    { id: 'batches',     name: 'Batches',              desc: 'All running and planned batches at this centre',     icon: '📚', tone: 'emerald', canvas: 'batches' },
    { id: 'trainers',    name: 'Trainers',             desc: 'Trainer roster, certifications and workload',        icon: '👨‍🏫', tone: 'sky',     canvas: 'centre_dashboard' },
    { id: 'cert_pipe',   name: 'Certification Pipeline',desc: 'Enrolled → Trained → Assessed → Certified funnel',  icon: '🎓', tone: 'amber',   canvas: 'cert_pipeline' },
    { id: 'placement',   name: 'Declare Placement',    desc: 'Declare placements for verified trainees',           icon: '🤝', tone: 'violet',  canvas: 'placement_declare' },
    { id: 'at_risk',     name: 'At-Risk Trainees',     desc: 'Drop-out risk by batch and attendance',              icon: '⚠️', tone: 'rose',    canvas: 'at_risk' },
    { id: 'inspection',  name: 'Inspection Readiness', desc: 'NSDC / SSC inspection self-check',                   icon: '🔍', tone: 'teal',    canvas: 'inspection' },
    { id: 'stipend_view',name: 'Stipend Status',       desc: 'Disbursement status across your trainees',           icon: '💸', tone: 'cyan',    canvas: 'stipend_queue' },
    { id: 'updates',     name: 'Updates & Alerts',     desc: 'Scheme announcements, accreditation notices',        icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  training_partner: [
    { id: 'rollup',         name: 'Multi-Centre Rollup',  desc: 'Outcomes across all your centres in one view',       icon: '🏢', tone: 'indigo',  canvas: 'tp_rollup' },
    { id: 'tracks',         name: 'Track Designer',       desc: 'Build training tracks combining job roles + schemes',icon: '🧩', tone: 'fuchsia', canvas: 'track_designer' },
    { id: 'scheme_alloc',   name: 'Scheme Allocation',    desc: 'Allocate batches to PMKVY, DDU-GKY, NAPS, …',        icon: '🎯', tone: 'amber',   canvas: 'scheme_allocation' },
    { id: 'placement',      name: 'Placements',           desc: 'Declare placements and track verification states',   icon: '🤝', tone: 'violet',  canvas: 'placement_declare' },
    { id: 'cert_pipe',      name: 'Certification Pipeline',desc: 'Enrolment → certification across all centres',      icon: '🎓', tone: 'emerald', canvas: 'cert_pipeline' },
    { id: 'quality',        name: 'Quality Index',        desc: 'Centre health score, anomalies and alerts',          icon: '🏆', tone: 'sky',     canvas: 'quality_index' },
    { id: 'at_risk',        name: 'At-Risk Trainees',     desc: 'High-risk trainees across centres',                  icon: '⚠️', tone: 'rose',    canvas: 'at_risk' },
    { id: 'batches',        name: 'All Batches',          desc: 'Active and planned batches org-wide',                icon: '📚', tone: 'teal',    canvas: 'batches' },
    { id: 'updates',        name: 'Updates & Alerts',     desc: 'Scheme changes, accreditation, broadcasts',          icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  assessor: [
    { id: 'queue',     name: 'Assessment Queue', desc: 'Today\'s and upcoming assessments assigned to you', icon: '🧾', tone: 'indigo',  canvas: 'assessment_queue' },
    { id: 'live',      name: 'Live Assessment',  desc: 'Conduct live oral / OCR assessments',               icon: '🎬', tone: 'rose',    canvas: 'live_assessment' },
    { id: 'submit',    name: 'Submit Result',    desc: 'Submit competency results — trainee acknowledges',  icon: '✅', tone: 'emerald', canvas: 'assessment_queue' },
    { id: 'calibrate', name: 'Calibration',      desc: 'Inter-assessor calibration reports',                icon: '🎯', tone: 'amber',   canvas: 'assessment_queue' },
    { id: 'updates',   name: 'Updates & Alerts', desc: 'Assignment alerts, scheme changes',                 icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  ssc: [
    { id: 'accred',     name: 'Accreditation Queue', desc: 'Pending TP and TC accreditation applications',   icon: '📜', tone: 'indigo',  canvas: 'accreditation' },
    { id: 'standards',  name: 'Standards Library',   desc: 'QPs, NOS, competency standards for your sector', icon: '📐', tone: 'sky',     canvas: 'standards' },
    { id: 'assessors',  name: 'Assessor Pool',       desc: 'Your pool of independent assessors',             icon: '👥', tone: 'violet',  canvas: 'standards' },
    { id: 'outcomes',   name: 'Sector Outcomes',     desc: 'Verified outcomes across your sector',           icon: '🎯', tone: 'emerald', canvas: 'sector_outcomes' },
    { id: 'broadcast',  name: 'Broadcast',           desc: 'Send targeted broadcasts to sector partners',    icon: '📣', tone: 'amber',   canvas: 'broadcast' },
    { id: 'updates',    name: 'Updates & Alerts',    desc: 'NCVET / NSDC updates and circulars',             icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  employer: [
    { id: 'confirm',    name: 'Confirm Hire',         desc: 'Pending placement confirmations from TPs',       icon: '✅', tone: 'emerald', canvas: 'employer_confirm' },
    { id: 'retention',  name: 'Day-90 Retention',     desc: 'Confirm continued employment at day 90',         icon: '📅', tone: 'amber',   canvas: 'retention_confirm' },
    { id: 'my_hires',   name: 'My Hires',             desc: 'All trainees you have hired through KSK',        icon: '👥', tone: 'indigo',  canvas: 'my_hires' },
    { id: 'post_job',   name: 'Post a Job',           desc: 'List openings — verified trainees apply',        icon: '➕', tone: 'fuchsia', canvas: 'post_job' },
    { id: 'payslip',    name: 'Acknowledge Payslip',  desc: 'Acknowledge salary slips uploaded by trainees',  icon: '🧾', tone: 'lime',    canvas: 'salary_slip' },
    { id: 'updates',    name: 'Updates & Alerts',     desc: 'Pending confirmations, broadcasts',              icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  nsdc_officer: [
    { id: 'overview',   name: 'National Overview',  desc: 'India command centre — KPIs across all schemes',     icon: '🇮🇳', tone: 'indigo',  canvas: 'national_overview' },
    { id: 'heatmap',    name: 'India Heatmap',      desc: 'State and district performance heatmap',             icon: '🗺️', tone: 'sky',     canvas: 'india_heatmap' },
    { id: 'cert',       name: 'Certification',      desc: 'National certification pipeline and delays',         icon: '🎓', tone: 'emerald', canvas: 'cert_dashboard' },
    { id: 'placement',  name: 'Placement',          desc: 'Placement funnel + maker-checker verification',      icon: '🤝', tone: 'violet',  canvas: 'placement_dashboard' },
    { id: 'retention',  name: 'Retention',          desc: 'Cohort retention by milestone, risk surface',        icon: '🔁', tone: 'amber',   canvas: 'retention_dashboard' },
    { id: 'schemes',    name: 'Scheme Analytics',   desc: 'PMKVY / DDU-GKY / NAPS / SIB / PM Vishwakarma',     icon: '📊', tone: 'teal',    canvas: 'scheme_analytics' },
    { id: 'war_room',   name: 'War Room',           desc: 'Live anomalies, fraud signals, drop-outs',           icon: '🚨', tone: 'rose',    canvas: 'war_room' },
    { id: 'broadcast',  name: 'Broadcast',          desc: 'Send targeted broadcasts to roles / states',         icon: '📣', tone: 'fuchsia', canvas: 'broadcast' },
    { id: 'reports',    name: 'Reports',            desc: 'Parliamentary, CEO, monthly outcome reports',        icon: '📄', tone: 'lime',    canvas: 'national_overview' },
    { id: 'updates',    name: 'Updates & Alerts',   desc: 'Real-time anomaly alerts',                           icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  funder: [
    { id: 'outcomes',   name: 'Verified Outcomes',      desc: 'Outcomes by scheme, state, cohort — no PII',         icon: '✅', tone: 'emerald', canvas: 'funder_outcomes' },
    { id: 'money',      name: 'Money vs Outcomes',      desc: 'Disbursal alignment with verified outcomes',         icon: '💰', tone: 'amber',   canvas: 'money_outcomes' },
    { id: 'schemes',    name: 'Scheme Analytics',       desc: 'Per-scheme verified outcomes view',                  icon: '📊', tone: 'indigo',  canvas: 'scheme_analytics' },
    { id: 'indep_ver',  name: 'Independent Verification',desc: 'Audit trail of independent verification',           icon: '🛡️', tone: 'sky',     canvas: 'funder_outcomes' },
    { id: 'reports',    name: 'Funder Reports',         desc: 'Quarterly outcomes and impact briefs',               icon: '📄', tone: 'teal',    canvas: 'funder_outcomes' },
    { id: 'updates',    name: 'Updates & Alerts',       desc: 'Verification milestones, outcome triggers',          icon: '🔔', tone: 'pink',    canvas: 'notifications' },
  ],
  stipend_officer: [
    { id: 'queue',     name: 'Disbursal Queue',      desc: 'Pending stipend disbursements across schemes',       icon: '💸', tone: 'indigo',  canvas: 'stipend_queue' },
    { id: 'failed',    name: 'Failed Disbursals',    desc: 'Aadhaar-bank failures and retry queue',              icon: '🔁', tone: 'rose',    canvas: 'stipend_retry' },
    { id: 'utr',       name: 'UTR Confirmations',    desc: 'UTRs, sanctioned vs disbursed totals',               icon: '🧾', tone: 'emerald', canvas: 'stipend_queue' },
    { id: 'reports',   name: 'Disbursal Reports',    desc: 'Monthly disbursal summaries by scheme',              icon: '📄', tone: 'amber',   canvas: 'stipend_queue' },
    { id: 'updates',   name: 'Updates & Alerts',     desc: 'PFMS notices, scheme guideline changes',             icon: '🔔', tone: 'pink',    canvas: 'notifications' },
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
