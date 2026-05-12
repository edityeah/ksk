// KSK action catalog — mirror of the frontend actionRegistry. The LLM interpreter
// is constrained to this list. Every action specifies which roles can invoke it.

export const ACTIONS = {
  // Trainee
  OPEN_SKILL_PASSPORT:           { module: 'skill_passport',    roles: ['trainee'], description: 'Open my Skill Passport — verified certificates, jobs, retention.' },
  OPEN_COURSE_DISCOVERY:         { module: 'course_discovery',  roles: ['trainee'], description: 'Browse skilling courses and apply.' },
  OPEN_CAREER_COUNSELLOR:        { module: 'career_counsellor', roles: ['trainee'], description: 'AI career guidance and skill gap analysis.' },
  OPEN_LEARNING_ASSISTANT:       { module: 'learning_assistant',roles: ['trainee'], description: 'AI tutor for course prep and revision.' },
  OPEN_ORAL_ASSESSMENT:          { module: 'oral_assessment',   roles: ['trainee'], description: 'Voice-based competency assessment.' },
  OPEN_OCR_EXAM:                 { module: 'ocr_exam',          roles: ['trainee'], description: 'OCR-based written assessment capture.' },
  OPEN_MOCK_INTERVIEW:           { module: 'mock_interview',    roles: ['trainee'], description: 'AI mock interview practice.' },
  OPEN_JOBS_MARKETPLACE:         { module: 'jobs_marketplace',  roles: ['trainee'], description: 'Browse jobs and apply with one tap.' },
  OPEN_TRAINEE_PLACEMENT_CONFIRM:{ module: 'placement_confirm', roles: ['trainee'], description: 'Confirm or deny a placement declared by training partner.' },
  OPEN_RETENTION_CHECKIN:        { module: 'retention_checkin', roles: ['trainee', 'employer'], description: 'Respond to a 30/60/90-day retention check-in.' },
  OPEN_SALARY_SLIP_UPLOAD:       { module: 'salary_slip',       roles: ['trainee'], description: 'Upload a payslip; AI extracts and verifies.' },
  OPEN_STIPEND_STATUS:           { module: 'stipend_status',    roles: ['trainee'], description: 'Check my stipend disbursements.' },
  OPEN_GRIEVANCE:                { module: 'grievance',         roles: ['trainee'], description: 'File a grievance.' },

  // Trainer
  OPEN_ATTENDANCE_MARK:          { module: 'attendance',        roles: ['trainer'], description: 'Mark today\'s batch attendance.' },
  OPEN_AT_RISK_TRAINEES:         { module: 'at_risk',           roles: ['trainer', 'training_centre', 'training_partner'], description: 'View at-risk trainees by attendance and assessment.' },
  OPEN_LESSON_DELIVERY:          { module: 'lesson_delivery',   roles: ['trainer'], description: 'Today\'s lesson plan and content.' },
  OPEN_QUIZ_CREATE:              { module: 'quiz',              roles: ['trainer'], description: 'Create a quiz for the batch.' },

  // Training Centre
  OPEN_CENTRE_DASHBOARD:         { module: 'centre_dashboard',  roles: ['training_centre'], description: 'Centre-wide attendance, batches, certification pipeline.' },
  OPEN_BATCHES:                  { module: 'batches',           roles: ['training_centre', 'training_partner', 'trainer'], description: 'Browse and manage batches.' },
  OPEN_CERTIFICATION_PIPELINE:   { module: 'cert_pipeline',     roles: ['training_centre', 'training_partner', 'nsdc_officer'], description: 'Track trainees through the certification funnel.' },
  OPEN_PLACEMENT_DECLARE:        { module: 'placement_declare', roles: ['training_centre', 'training_partner'], description: 'Declare a new placement for a certified trainee.' },
  OPEN_INSPECTION_READINESS:     { module: 'inspection',        roles: ['training_centre'], description: 'Inspection-readiness checklist for the centre.' },

  // Training Partner
  OPEN_TP_ROLLUP:                { module: 'tp_rollup',         roles: ['training_partner'], description: 'Multi-centre roll-up for this training partner.' },
  OPEN_TRACK_DESIGNER:           { module: 'track_designer',    roles: ['training_partner'], description: 'Design training tracks (job role combinations).' },
  OPEN_SCHEME_ALLOCATION:        { module: 'scheme_allocation', roles: ['training_partner'], description: 'Allocate batches to schemes (PMKVY/DDU-GKY/NAPS/etc.).' },
  OPEN_QUALITY_INDEX:            { module: 'quality_index',     roles: ['training_partner', 'nsdc_officer'], description: 'Centre quality index.' },

  // Assessor
  OPEN_ASSESSMENT_QUEUE:         { module: 'assessment_queue',  roles: ['assessor'], description: 'My pending assessments.' },
  OPEN_LIVE_ASSESSMENT:          { module: 'live_assessment',   roles: ['assessor'], description: 'Conduct a live competency assessment.' },
  OPEN_ASSESSMENT_ACK:           { module: 'assessment_ack',    roles: ['trainee'], description: 'Acknowledge an assessment result.' },

  // SSC
  OPEN_ACCREDITATION_QUEUE:      { module: 'accreditation',     roles: ['ssc'], description: 'Review new TP/TC accreditation applications.' },
  OPEN_STANDARDS_LIBRARY:        { module: 'standards',         roles: ['ssc', 'training_partner'], description: 'Browse QPs and competency standards.' },
  OPEN_SECTOR_OUTCOMES:          { module: 'sector_outcomes',   roles: ['ssc', 'nsdc_officer'], description: 'Sector-level outcomes.' },

  // Employer
  OPEN_EMPLOYER_CONFIRM:         { module: 'employer_confirm',  roles: ['employer'], description: 'Confirm a new hire declared by training partner.' },
  OPEN_RETENTION_CONFIRM_90:     { module: 'retention_confirm', roles: ['employer'], description: 'Day-90 retention confirmation for a hired trainee.' },
  OPEN_MY_HIRES:                 { module: 'my_hires',          roles: ['employer'], description: 'All hires I have confirmed.' },
  OPEN_POST_JOB:                 { module: 'post_job',          roles: ['employer'], description: 'Post a new job opening.' },

  // NSDC Officer
  OPEN_INDIA_HEATMAP:            { module: 'india_heatmap',     roles: ['nsdc_officer'], description: 'India heat-map of skilling outcomes.' },
  OPEN_NATIONAL_OVERVIEW:        { module: 'national_overview', roles: ['nsdc_officer'], description: 'National command-centre dashboard.' },
  OPEN_CERT_DASHBOARD:           { module: 'cert_dashboard',    roles: ['nsdc_officer'], description: 'National certification dashboard.' },
  OPEN_PLACEMENT_DASHBOARD:      { module: 'placement_dashboard', roles: ['nsdc_officer'], description: 'National placement dashboard.' },
  OPEN_RETENTION_DASHBOARD:      { module: 'retention_dashboard', roles: ['nsdc_officer'], description: 'National retention dashboard.' },
  OPEN_SCHEME_ANALYTICS:         { module: 'scheme_analytics',  roles: ['nsdc_officer', 'funder'], description: 'Per-scheme outcome analytics.' },
  OPEN_WAR_ROOM:                 { module: 'war_room',          roles: ['nsdc_officer'], description: 'Anomaly and alert war room.' },
  OPEN_BROADCAST:                { module: 'broadcast',         roles: ['nsdc_officer', 'ssc'], description: 'Send a broadcast to targeted roles.' },

  // Funder
  OPEN_FUNDER_OUTCOMES:          { module: 'funder_outcomes',   roles: ['funder'], description: 'Verified outcomes by scheme/state/cohort (no PII).' },
  OPEN_MONEY_AGAINST_OUTCOMES:   { module: 'money_outcomes',    roles: ['funder'], description: 'Money disbursed against verified outcomes.' },

  // Stipend Officer
  OPEN_STIPEND_QUEUE:            { module: 'stipend_queue',     roles: ['stipend_officer'], description: 'Stipend disbursement queue.' },
  OPEN_AADHAAR_BANK_RETRY:       { module: 'stipend_retry',     roles: ['stipend_officer'], description: 'Retry failed Aadhaar-bank disbursements.' },

  // Shared
  OPEN_NOTIFICATIONS:            { module: 'notifications',     roles: ['*'], description: 'Open notifications panel.' },
  ANSWER_QUESTION:               { module: 'ask_ai',            roles: ['*'], description: 'Answer a general question using the KSK knowledge base.' },
}

export function actionsForRole(role) {
  const out = []
  for (const [id, def] of Object.entries(ACTIONS)) {
    if (def.roles.includes('*') || def.roles.includes(role)) {
      out.push({ id, module: def.module, description: def.description })
    }
  }
  return out
}

export function actionAllowed(actionId, role) {
  const a = ACTIONS[actionId]
  if (!a) return false
  return a.roles.includes('*') || a.roles.includes(role)
}
