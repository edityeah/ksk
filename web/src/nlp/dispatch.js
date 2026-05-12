// Front-end dispatcher for actions returned by /api/ai/message.
// Each action id maps to a canvas open (or a toast / nav).

const ACTION_TO_CANVAS = {
  // Trainee
  OPEN_SKILL_PASSPORT:           { type: 'skill_passport' },
  OPEN_COURSE_DISCOVERY:         { type: 'course_discovery' },
  OPEN_CAREER_COUNSELLOR:        { type: 'career_counsellor' },
  OPEN_LEARNING_ASSISTANT:       { type: 'learning_assistant' },
  OPEN_ORAL_ASSESSMENT:          { type: 'oral_assessment' },
  OPEN_OCR_EXAM:                 { type: 'ocr_exam' },
  OPEN_MOCK_INTERVIEW:           { type: 'mock_interview' },
  OPEN_JOBS_MARKETPLACE:         { type: 'jobs_marketplace' },
  OPEN_TRAINEE_PLACEMENT_CONFIRM:{ type: 'placement_confirm' },
  OPEN_RETENTION_CHECKIN:        { type: 'retention_checkin' },
  OPEN_SALARY_SLIP_UPLOAD:       { type: 'salary_slip' },
  OPEN_STIPEND_STATUS:           { type: 'stipend_status' },
  OPEN_GRIEVANCE:                { type: 'grievance' },

  // Trainer
  OPEN_ATTENDANCE_MARK:          { type: 'attendance' },
  OPEN_AT_RISK_TRAINEES:         { type: 'at_risk' },
  OPEN_LESSON_DELIVERY:          { type: 'lesson_delivery' },
  OPEN_QUIZ_CREATE:              { type: 'quiz' },

  // Training Centre / Partner
  OPEN_CENTRE_DASHBOARD:         { type: 'centre_dashboard' },
  OPEN_BATCHES:                  { type: 'batches' },
  OPEN_CERTIFICATION_PIPELINE:   { type: 'cert_pipeline' },
  OPEN_PLACEMENT_DECLARE:        { type: 'placement_declare' },
  OPEN_INSPECTION_READINESS:     { type: 'inspection' },
  OPEN_TP_ROLLUP:                { type: 'tp_rollup' },
  OPEN_TRACK_DESIGNER:           { type: 'track_designer' },
  OPEN_SCHEME_ALLOCATION:        { type: 'scheme_allocation' },
  OPEN_QUALITY_INDEX:            { type: 'quality_index' },

  // Assessor / SSC
  OPEN_ASSESSMENT_QUEUE:         { type: 'assessment_queue' },
  OPEN_LIVE_ASSESSMENT:          { type: 'live_assessment' },
  OPEN_ASSESSMENT_ACK:           { type: 'assessment_ack' },
  OPEN_ACCREDITATION_QUEUE:      { type: 'accreditation' },
  OPEN_STANDARDS_LIBRARY:        { type: 'standards' },
  OPEN_SECTOR_OUTCOMES:          { type: 'sector_outcomes' },

  // Employer
  OPEN_EMPLOYER_CONFIRM:         { type: 'employer_confirm' },
  OPEN_RETENTION_CONFIRM_90:     { type: 'retention_confirm' },
  OPEN_MY_HIRES:                 { type: 'my_hires' },
  OPEN_POST_JOB:                 { type: 'post_job' },

  // NSDC Officer
  OPEN_INDIA_HEATMAP:            { type: 'india_heatmap' },
  OPEN_NATIONAL_OVERVIEW:        { type: 'national_overview' },
  OPEN_CERT_DASHBOARD:           { type: 'cert_dashboard' },
  OPEN_PLACEMENT_DASHBOARD:      { type: 'placement_dashboard' },
  OPEN_RETENTION_DASHBOARD:      { type: 'retention_dashboard' },
  OPEN_SCHEME_ANALYTICS:         { type: 'scheme_analytics' },
  OPEN_WAR_ROOM:                 { type: 'war_room' },
  OPEN_BROADCAST:                { type: 'broadcast' },

  // Funder / Stipend
  OPEN_FUNDER_OUTCOMES:          { type: 'funder_outcomes' },
  OPEN_MONEY_AGAINST_OUTCOMES:   { type: 'money_outcomes' },
  OPEN_STIPEND_QUEUE:            { type: 'stipend_queue' },
  OPEN_AADHAAR_BANK_RETRY:       { type: 'stipend_retry' },

  OPEN_NOTIFICATIONS:            { type: 'notifications' },
}

export function dispatchActionForRole({ actionId, entities = {}, role, openCanvas, showToast }) {
  const c = ACTION_TO_CANVAS[actionId]
  if (!c) { showToast?.({ kind: 'warn', text: 'Action not yet wired in this prototype.' }); return }
  openCanvas?.({ ...c, ...entities })
}
