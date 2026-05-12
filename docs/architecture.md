# KSK — Architecture

_Last updated: 2026-05-12_

## 1. Vision

KSK (Kaushal Samiksha Kendra) is a national skilling Monitoring & Evaluation command centre running on SwiftChat. Forked from the SwiftChat v3 VSK Gujarat prototype, retargeted to NSDC / MSDE.

The thesis: **maker-checker for every record.** No single actor controls a complete record. Trainee, employer, training partner each confirm independently inside SwiftChat. Every consequential data point (enrolment, attendance, certification, placement, retention) requires at least two independent actors to confirm before it is marked verified.

## 2. Stack

**Frontend** (`web/`): Vite + React 18 + Tailwind 3 + lucide-react. No react-router (screen routing via `AppContext.screen`). All UI prefs in versioned `localStorage`; all domain entities via REST to backend.

**Backend** (`server/`): Node 20 + Express + Prisma + SQLite (Postgres-compatible schema). OpenAI gpt-4o for chat orchestration + text-embedding-3-small for RAG. Vector store: `sqlite-vec` for dev, pgvector for hosted Postgres. JWT auth (demo-grade — seeded users, OTPs `1234`/`123456`).

**Cross-actor liveness:** 5-second polling on key endpoints (no websockets in v1).

## 3. Ten Actors

| # | Role | Login | Scope | Headline modules |
|---|---|---|---|---|
| 1 | Trainee | Phone OTP or Aadhaar KYC | Self | Skill Passport, Course Discovery, Career Counsellor, Learning Assistant, Oral & OCR Assessments, Mock Interview, Placement Tracker, Retention Check-in, Jobs Marketplace, Stipend Status |
| 2 | Trainer | Phone OTP or SIDH | Own batches | Attendance, Daily Lesson Delivery, Quiz, At-Risk Trainees, Parent Outreach, Curriculum Library |
| 3 | Training Centre | Phone OTP | One physical centre | Centre Dashboard, Batches, Trainers, Attendance Approval, Certification Pipeline, Inspection Readiness, Placement Declaration |
| 4 | Training Partner | Phone OTP | Multi-centre org | Multi-centre Rollup, Track Designer, Scheme Allocation, Outcome Dashboards, Placement Declarations, Quality Index |
| 5 | Assessor | Phone OTP | Job role / sector | Assessment Queue, Live Assessment Capture (oral + OCR), Result Submission, Calibration Reports |
| 6 | SSC (Sector Skills Council) | Phone OTP | Sector | Accreditation Queue (new TPs/TCs), Standards Library, Assessor Pool, Sector Outcomes |
| 7 | Employer | Phone OTP | Trainees they hired | Hiring Confirmation, Day-90 Retention Confirmation, Salary Slip Acknowledgement, Post a Job |
| 8 | NSDC Officer (National) | Phone OTP | National | India Heatmap, 4 KSK Dashboards (National Overview / Certification / Placement / Retention), Scheme Analytics, War Room, Anomaly Alerts, Broadcasts |
| 9 | Funder | Phone OTP | Verified outcomes only (no PII) | Outcome Dashboards by scheme / state / cohort, Money-against-outcomes view, Independent verification status |
| 10 | Stipend Payment Officer | Phone OTP | National payments | Disbursement Queue, Aadhaar-Bank Failure Retry, UTR Confirmation, Sanctioned vs Disbursed |

Hierarchy: **SSC accredits → Training Partner → Training Centre → Trainer → Trainee.** Assessor / Employer / NSDC / Funder / Stipend Officer are parallel verifiers.

ITI special case: modelled as a Training Partner with exactly one Training Centre.

## 4. Schemes covered (configuration, not hardcode)

PMKVY (incl. 5.0 with skill vouchers), NAPS, JSS, PM Vishwakarma, PM VIKAS, Skill Impact Bond, DDU-GKY, PM SETU (ITIs), SAMARTH, DAY-NULM, PM-DAKSH, FutureSkills Prime, Nal Jal Mitra, NGHM. KSK is scheme-agnostic; `scheme` is a column.

## 5. Screen graph

```
Splash → Language → Login (3 buttons)
  ├── Phone Entry → Phone OTP → Home
  ├── Aadhaar Entry → Aadhaar OTP → Home          (trainee only)
  └── SIDH Portal Redirect → Verifying → OK/Fail → Home
```

Home shells by role (rendered by one `SuperHomePage.jsx` that dispatches on `role`):

- Mobile-frame (max-w-[420px], letter-boxed on desktop): Trainee, Trainer, Employer
- Full-width dashboard with chat sidebar: Training Centre, Training Partner, Assessor, SSC, NSDC Officer, Funder, Stipend Officer

All actors share: top bar (bot/role/notifications/canvas/profile), sidebar (chat history grouped by recency, plus bot tiles), greeting + Ask AI panel, canvas-on-right (40-60% panel on desktop, full-screen overlay on mobile).

## 6. Maker-Checker verification state machine

This is the structural core. Every consequential record passes through:

```
declared_by_one_actor          → state: claimed-unverified
+ confirmed_by_second_actor    → state: partially-verified
+ confirmed_by_third_actor     → state: verified
any_two_signals_disagree       → state: conflicted-flagged
declared_but_subject_denies    → state: disputed-payment-blocked
```

Applied to placements: TP declares + Trainee confirms + Employer confirms = verified.
Applied to retention: Trainee confirms at day 30/60/90 + Employer confirms at day 90 = verified.
Applied to certification: Assessor records + Trainee acknowledges = verified.
Applied to attendance: Trainer marks + Trainee weekly check-in = verified (discrepancy = flag).

## 7. Data model (Prisma, simplified)

Core entities:

- **User** — id, role, phone, aadhaar, sidhId, password (hashed), name, profile (JSON)
- **Sector** — code, name, ssc (FK)
- **Scheme** — code, name, ministry, paymentModel
- **JobRole** — code, name, sector (FK), nsqfLevel, qpCode
- **TrainingPartner** — id, name, accreditationStatus, scheme (FK), parentSsc (FK)
- **TrainingCentre** — id, name, address, capacity, parentTp (FK)
- **Track** — id, name, tp (FK), jobRoles (M2M), schemes (M2M), durationDays
- **Batch** — id, code, tc (FK), track (FK), trainer (FK), startDate, endDate, capacity, scheme
- **Trainee** — id, name, aadhaar, phone, gender, age, education, batch (FK), enrolmentDate, enrolmentConfirmedAt, dropoutAt
- **Attendance** — id, batch (FK), trainee (FK), date, trainerMark (enum), traineeMark (enum), state
- **Assessment** — id, trainee (FK), assessor (FK), jobRole (FK), date, result, score, evidence (JSON)
- **Certificate** — id, trainee (FK), jobRole (FK), issuedAt, digiLockerRef
- **Placement** — id, trainee (FK), employer (FK), declaredByTp (FK to User), role, ctc, joiningDate, tpDeclaredAt, traineeConfirmedAt, employerConfirmedAt, state, appointmentLetterUrl
- **RetentionCheckin** — id, placement (FK), milestone (30/60/90), dueAt, traineeRespondedAt, traineeStatus, employerRespondedAt, employerStatus, salarySlipUrl, state
- **SalarySlip** — id, placement (FK), month, employerName, grossSalary, pfNumber, fileUrl, ocrExtract (JSON)
- **Employer** — id, name, type (formal/informal), pincode, sector (FK), epfo, esic
- **Stipend** — id, trainee (FK), amount, scheme (FK), month, disbursalStatus, utr, failureReason, retryCount
- **Notification** — standard SwiftChat shape (see notifications section)
- **ChatMessage**, **ChatThread** — standard SwiftChat shape

## 8. NLP / AI layer

Direct fork of SwiftChat's pipeline. Pieces:

- `actionRegistry.js` — `OPEN_SKILL_PASSPORT`, `OPEN_PLACEMENT_VERIFICATION`, `OPEN_RETENTION_CHECKIN`, `OPEN_EMPLOYER_CONFIRMATION`, `OPEN_CERTIFICATION_PIPELINE`, `OPEN_INDIA_HEATMAP`, `OPEN_SCHEME_ANALYTICS`, `OPEN_FUNDER_OUTCOMES`, `OPEN_STIPEND_QUEUE`, `OPEN_ASSESSMENT_QUEUE`, `OPEN_TRACK_DESIGNER`, `OPEN_ACCREDITATION_QUEUE`, `OPEN_COURSE_DISCOVERY`, `OPEN_CAREER_COUNSELLOR`, `OPEN_LEARNING_ASSISTANT`, `OPEN_MOCK_INTERVIEW`, `OPEN_JOBS_MARKETPLACE`, `OPEN_ATTENDANCE`, `OPEN_BATCH_DASHBOARD`, `OPEN_CENTRE_DASHBOARD`, `OPEN_WAR_ROOM`, `CREATE_REMINDER`, `CREATE_BROADCAST`, etc.
- `moduleRegistry.js` — module ids with `allowedRoles`, aliases (multilingual), canvas view.
- `localPatterns.js` — regex fallback for `mark attendance`, `show passport`, `verify placement`, `retention checkin`, `india heatmap`, etc. Multilingual: en + hi (Devanagari + Hinglish).
- `permissionGuard.js` — role-gated.
- `globalIntentRouter.js` — directive emitter (trigger / canvas / reply / notification / clarify / confirm / denied / answer).
- Backend `/api/ai/message` — orchestrator; classifies action OR runs RAG.
- RAG knowledge base (markdown chunked & embedded): KSK master ref, BRD, all scheme guidelines, SIB concept note, Cohort 6 close-out, role-action matrix, FAQ.

## 9. Canvas modules (one file per module in `web/src/canvas/modules/`)

**Trainee:** SkillPassportCanvas, CourseDiscoveryCanvas, CareerCounsellorCanvas, LearningAssistantCanvas, OralAssessmentCanvas, OCRExamCanvas, MockInterviewCanvas, JobsMarketplaceCanvas, RetentionCheckinCanvas (responding), SalarySlipUploadCanvas, StipendStatusCanvas, GrievanceCanvas.

**Trainer:** AttendanceCanvas (mark), LessonDeliveryCanvas, QuizCanvas, AtRiskTraineesCanvas, ParentOutreachCanvas, CurriculumLibraryCanvas.

**Training Centre:** CentreDashboardCanvas, BatchesCanvas, TrainersCanvas, AttendanceApprovalCanvas, CertificationPipelineCanvas, InspectionReadinessCanvas, PlacementDeclarationCanvas.

**Training Partner:** MultiCentreRollupCanvas, TrackDesignerCanvas, SchemeAllocationCanvas, TpOutcomeDashboardsCanvas, BulkPlacementCanvas, QualityIndexCanvas.

**Assessor:** AssessmentQueueCanvas, LiveAssessmentCanvas, ResultSubmissionCanvas, CalibrationReportsCanvas.

**SSC:** AccreditationQueueCanvas, StandardsLibraryCanvas, AssessorPoolCanvas, SectorOutcomesCanvas.

**Employer:** HiringConfirmationCanvas, RetentionConfirmationCanvas (day 90), SalarySlipAckCanvas, PostJobCanvas, MyHiresCanvas.

**NSDC Officer:** IndiaHeatmapCanvas, NationalOverviewCanvas, CertificationDashboardCanvas, PlacementDashboardCanvas, RetentionDashboardCanvas, SchemeAnalyticsCanvas, WarRoomCanvas, AnomalyAlertsCanvas, BroadcastCanvas.

**Funder:** FunderOutcomesCanvas, MoneyAgainstOutcomesCanvas, IndependentVerificationCanvas.

**Stipend Officer:** StipendQueueCanvas, AadhaarBankRetryCanvas, UtrConfirmationCanvas, SanctionedVsDisbursedCanvas.

**Shared:** NotificationCanvas, ReportExportCanvas, GrievanceCanvas.

## 10. Notifications

Type/category/priority/targetRoles model identical to SwiftChat. New KSK categories:
`certification_deadline`, `assessor_visit`, `placement_verification`, `retention_due`, `stipend`, `scheme_announcement`, `centre_audit`, `accreditation_review`, `dropout_alert`, `anomaly_flag`, `general`.

Persisted server-side (so cross-actor pings work) plus a localStorage mirror for offline read state.

## 11. Out of scope for v1

- Real Aadhaar / DigiLocker / SIDH / EPFO / ESIC integrations (all mocked)
- Real SMS / WhatsApp delivery (notifications are in-app only)
- Real payment rails (Stipend Officer canvas simulates)
- Multi-tenant org isolation (single demo workspace)
- Production-grade auth (JWT but no refresh tokens, no MFA)
- Native mobile apps (web-only; mobile-frame is just a max-width letterbox)

## 12. Build sequence (top-down)

1. Backend Prisma schema + migrations + seed + auth + core domain routes
2. Frontend scaffold + AppContext + screen router + login flow
3. Trainee end-to-end (most visible, mobile-first)
4. Training Partner + Training Centre (declares placements)
5. Employer (independent confirmation)
6. NSDC Officer dashboards (the funder-facing screens)
7. Assessor + SSC + Funder + Stipend Officer
8. Trainer
9. RAG knowledge base ingestion
10. End-to-end demo script across 3 browsers (TP / Trainee / Employer)
