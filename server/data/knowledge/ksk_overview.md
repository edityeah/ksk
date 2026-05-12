# KSK Overview — Kaushal Samiksha Kendra

## What KSK is

KSK (Kaushal Samiksha Kendra) is a national skilling Monitoring & Evaluation command centre running on SwiftChat. It is the intelligence and verification layer across India's skilling ecosystem under NSDC and the Ministry of Skill Development & Entrepreneurship (MSDE).

KSK functions as:
- a national skilling intelligence layer,
- an outcome-monitoring platform,
- a decision-support system,
- and an AI-enabled operational dashboard for skilling schemes.

The objective is to shift skilling governance from activity-based monitoring to outcome-based governance.

## The problem KSK solves

India spends approximately ₹25,000–30,000 crore per year on skilling through central and state government programmes. This money is supposed to train young people, get them certified, help them find jobs, and ensure they stay employed. The current system cannot reliably verify whether any of these outcomes actually happened.

In Cohorts 1 through 4 of the Skill Impact Bond, between 22% and 27% of placement records were found to be wrong when independently verified by an external firm calling 793 randomly selected trainees on the phone. More than one in four records was a mismatch.

The root causes are four:
1. Documents are paper-based, manually created, and easily faked.
2. The training company controls the entire data chain — they enrol, place, upload documents, and report.
3. The trainee and employer never independently confirm anything.
4. SIDH (where TPs upload data) and JobX (where employers and trainees confirm) are not connected.

## The maker-checker principle

The fundamental design of KSK changes the data architecture structurally. Different actors create different pieces of every record, and no single actor can control a complete record:

- The training partner can declare enrolment, but only the trainee can confirm attendance.
- Only the employer can confirm hiring.
- Only the government employment database (where integrated) can confirm salary was paid.

Every consequential data point requires at least two independent actors to confirm before it is marked verified.

## Outcome pillars

KSK monitors three core outcome pillars across all schemes:

1. **Certification** — training and certification outcomes.
2. **Placement** — employability and job linkage (three-signal verification: TP + Trainee + Employer).
3. **Retention** — sustainability and long-term employment outcomes (30/60/90/180-day check-ins).
