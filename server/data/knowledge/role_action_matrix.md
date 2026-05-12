# Role-Action Matrix — Who can do what on KSK

## Ten roles

1. **Trainee** — phone OTP or Aadhaar KYC. Manages own Skill Passport, confirms placement, responds to retention check-ins.
2. **Trainer** — phone OTP or SIDH SSO. Marks attendance, runs daily delivery for own batch.
3. **Training Centre** — phone OTP. Admin of one physical centre; manages trainers, batches, certification pipeline.
4. **Training Partner** — phone OTP. Parent organisation of multiple centres; declares placements, designs tracks.
5. **Assessor** — phone OTP. Independent — never employed by the TP — conducts competency assessments after training.
6. **Sector Skills Council (SSC)** — phone OTP. Accredits new TPs and TCs, owns the standards library.
7. **Employer** — phone OTP. Confirms hires independently, confirms day-90 retention, optionally posts jobs.
8. **NSDC Officer (National)** — phone OTP. Sees all schemes, all states, all training partners; can override disputed records with audit trail.
9. **Funder** — phone OTP. Sees verified outcomes only, no PII; views money disbursed against verified outcomes.
10. **Stipend Payment Officer** — phone OTP. Operates the disbursement queue, retries Aadhaar-bank failures, confirms UTRs.

## Hierarchy

```
SSC accredits → Training Partner → Training Centre → Trainer → Trainee
```

Parallel verifiers: Assessor (independent), Employer, NSDC Officer (oversight), Funder (read-only outcomes), Stipend Officer (payments).

## ITIs

An ITI is modelled as a Training Partner with exactly one Training Centre. Same UI, same verification flow.

## What each role can write

| Field | Who can write |
|---|---|
| Enrolment | TP/TC declares; Trainee confirms (maker-checker) |
| Attendance | Trainer marks; Trainee weekly self-confirms |
| Assessment result | Assessor; Trainee acknowledges |
| Certificate | Assessor (auto on pass); Trainee receives in DigiLocker |
| Placement | TP/TC declares; Trainee confirms; Employer confirms |
| Retention | Trainee responds at day 30/60/90; Employer responds at day 90 |
| Salary slip | Trainee uploads; OCR extracts; Employer optionally acknowledges |
| Stipend disbursal | Stipend Officer triggers; UTR confirms |
