// Canvas module registry. Each entry maps `canvas.type` to a React component + metadata.

import PlacementConfirmCanvas from './PlacementConfirmCanvas.jsx'
import EmployerConfirmCanvas from './EmployerConfirmCanvas.jsx'
import PlacementDeclareCanvas from './PlacementDeclareCanvas.jsx'
import RetentionCheckinCanvas from './RetentionCheckinCanvas.jsx'
import SkillPassportCanvas from './SkillPassportCanvas.jsx'
import NationalOverviewCanvas from './NationalOverviewCanvas.jsx'
import PlacementDashboardCanvas from './PlacementDashboardCanvas.jsx'
import RetentionDashboardCanvas from './RetentionDashboardCanvas.jsx'
import FunderOutcomesCanvas from './FunderOutcomesCanvas.jsx'
import StipendQueueCanvas from './StipendQueueCanvas.jsx'
import AssessmentQueueCanvas from './AssessmentQueueCanvas.jsx'
import AccreditationQueueCanvas from './AccreditationQueueCanvas.jsx'
import MyHiresCanvas from './MyHiresCanvas.jsx'
import CourseDiscoveryCanvas from './CourseDiscoveryCanvas.jsx'
import JobsMarketplaceCanvas from './JobsMarketplaceCanvas.jsx'
import StipendStatusCanvas from './StipendStatusCanvas.jsx'
import NotificationsCanvas from './NotificationsCanvas.jsx'
import CareerCounsellorCanvas from './CareerCounsellorCanvas.jsx'
import MockInterviewCanvas from './MockInterviewCanvas.jsx'
import LearningAssistantCanvas from './LearningAssistantCanvas.jsx'
import SwiftyAssistantCanvas from './SwiftyAssistantCanvas.jsx'
import GrievanceCanvas from './GrievanceCanvas.jsx'
import SalarySlipCanvas from './SalarySlipCanvas.jsx'
import TrainingPartnersDashboardCanvas from './TrainingPartnersDashboardCanvas.jsx'
import CandidatesAnalyticsCanvas from './CandidatesAnalyticsCanvas.jsx'
import BatchesAnalyticsCanvas from './BatchesAnalyticsCanvas.jsx'
import SectorsAnalyticsCanvas from './SectorsAnalyticsCanvas.jsx'
import OutcomesCanvas from './OutcomesCanvas.jsx'
import WarRoomCanvas from './WarRoomCanvas.jsx'
import GenericCanvas from './GenericCanvas.jsx'

export const CANVAS_MODULES = {
  placement_confirm:    PlacementConfirmCanvas,
  employer_confirm:     EmployerConfirmCanvas,
  placement_declare:    PlacementDeclareCanvas,
  retention_checkin:    RetentionCheckinCanvas,
  retention_confirm:    RetentionCheckinCanvas,
  skill_passport:       SkillPassportCanvas,
  national_overview:    NationalOverviewCanvas,
  placement_dashboard:  PlacementDashboardCanvas,
  retention_dashboard:  RetentionDashboardCanvas,
  funder_outcomes:      FunderOutcomesCanvas,
  money_outcomes:       FunderOutcomesCanvas,
  stipend_queue:        StipendQueueCanvas,
  stipend_retry:        StipendQueueCanvas,
  stipend_status:       StipendStatusCanvas,
  assessment_queue:     AssessmentQueueCanvas,
  accreditation:        AccreditationQueueCanvas,
  my_hires:             MyHiresCanvas,
  course_discovery:     CourseDiscoveryCanvas,
  jobs_marketplace:     JobsMarketplaceCanvas,
  career_counsellor:    CareerCounsellorCanvas,
  mock_interview:       MockInterviewCanvas,
  learning_assistant:   LearningAssistantCanvas,
  swifty_assistant:     SwiftyAssistantCanvas,
  grievance:            GrievanceCanvas,
  salary_slip:          SalarySlipCanvas,
  // NSDC analyst dashboards — each maps to a NSDC Academy Power BI tab.
  training_partners:    TrainingPartnersDashboardCanvas,
  candidates_analytics: CandidatesAnalyticsCanvas,
  batches_analytics:    BatchesAnalyticsCanvas,
  sectors_analytics:    SectorsAnalyticsCanvas,
  outcomes:             OutcomesCanvas,
  war_room:             WarRoomCanvas,
  notifications:        NotificationsCanvas,

  // Generic placeholder for any type not yet built — renders a clean "coming next" page
  // Used for: career_counsellor, learning_assistant, oral_assessment, ocr_exam, mock_interview,
  //           grievance, salary_slip, attendance, lesson_delivery, quiz, at_risk,
  //           centre_dashboard, batches, cert_pipeline, inspection, tp_rollup, track_designer,
  //           scheme_allocation, quality_index, live_assessment, assessment_ack, standards,
  //           sector_outcomes, post_job, india_heatmap, cert_dashboard, scheme_analytics,
  //           war_room, broadcast
  __default__:          GenericCanvas,
}

const META = {
  placement_confirm:    { title: 'Confirm your placement', subtitle: 'Maker-checker · Trainee step', icon: '🤝' },
  employer_confirm:     { title: 'Confirm a hire', subtitle: 'Maker-checker · Employer step', icon: '✅' },
  placement_declare:    { title: 'Declare a placement', subtitle: 'Training partner / centre step', icon: '📝' },
  retention_checkin:    { title: 'Retention check-in', subtitle: '30 / 60 / 90 day verification', icon: '📅' },
  retention_confirm:    { title: 'Day-90 retention confirmation', subtitle: 'Employer step', icon: '📅' },
  skill_passport:       { title: 'Skill Passport', subtitle: 'Verified credentials & history', icon: '🪪' },
  national_overview:    { title: 'National Overview', subtitle: 'KSK Command Centre', icon: '🇮🇳' },
  placement_dashboard:  { title: 'Placement Dashboard', subtitle: '3-signal verification funnel', icon: '🤝' },
  retention_dashboard:  { title: 'Retention Dashboard', subtitle: 'Cohort retention by milestone', icon: '🔁' },
  funder_outcomes:      { title: 'Verified Outcomes (Funder)', subtitle: 'No PII · scheme-level', icon: '✅' },
  money_outcomes:       { title: 'Money vs Verified Outcomes', subtitle: 'Disbursal alignment', icon: '💰' },
  stipend_queue:        { title: 'Stipend Queue', subtitle: 'Disbursements + failures', icon: '💸' },
  stipend_retry:        { title: 'Aadhaar-Bank Retry', subtitle: 'Failed disbursements', icon: '🔁' },
  stipend_status:       { title: 'My Stipend', subtitle: 'Status & history', icon: '💸' },
  assessment_queue:     { title: 'Assessment Queue', subtitle: 'Today & upcoming', icon: '🧾' },
  accreditation:        { title: 'Accreditation Queue', subtitle: 'New TP / TC applications', icon: '📜' },
  my_hires:             { title: 'My Hires', subtitle: 'Trainees I have hired', icon: '👥' },
  course_discovery:     { title: 'Discover Courses', subtitle: 'Apply in one tap', icon: '🧭' },
  jobs_marketplace:     { title: 'Jobs', subtitle: 'Open openings near you', icon: '💼' },
  notifications:        { title: 'Notifications', subtitle: 'Reminders & broadcasts', icon: '🔔' },
  career_counsellor:    { title: 'Career Counsellor', subtitle: 'Karuna · AI career guide', icon: '🎯' },
  mock_interview:       { title: 'Mock Interview',     subtitle: 'Sharma ji · interview coach', icon: '🎙' },
  learning_assistant:   { title: 'Learning Assistant', subtitle: 'Guru ji · AI tutor', icon: '📚' },
  swifty_assistant:     { title: 'Saathi',              subtitle: 'Your skilling companion · enroll → train → certify → place', icon: '✨' },
  grievance:            { title: 'Grievance',           subtitle: 'File and track grievances with NSDC', icon: '🆘' },
  salary_slip:          { title: 'Upload Payslip',      subtitle: 'OCR-verified salary slips → DigiLocker', icon: '🧾' },
  // NSDC analyst dashboards
  national_overview:    { title: 'National Overview',   subtitle: 'NSDC Academy · headline KPIs + funnel',     icon: '🇮🇳' },
  training_partners:    { title: 'Training Partners',   subtitle: '587 TPs · audit, broadcast, drilldown',     icon: '🏢' },
  candidates_analytics: { title: 'Candidates',          subtitle: '27.74 L candidates · demographics + drill', icon: '👥' },
  batches_analytics:    { title: 'Batches',             subtitle: '5.9 L batches · throughput + scheme split', icon: '📚' },
  sectors_analytics:    { title: 'Sectors',             subtitle: '37 sectors · E/T/A/C funnel per sector',    icon: '📊' },
  outcomes:             { title: 'Outcomes',            subtitle: 'Placement, women, assessment quality',      icon: '🎯' },
  war_room:             { title: 'War Room',            subtitle: 'Live anomalies · investigate + act',        icon: '🚨' },
}

export function getCanvasMeta(type) {
  return META[type] || { title: type.replace(/_/g, ' '), subtitle: '', icon: '🗂' }
}

// Fallback resolver
export function moduleFor(type) {
  return CANVAS_MODULES[type] || CANVAS_MODULES.__default__
}
