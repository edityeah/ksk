# Placement Verification Workflow

## The three signals

A placement in KSK is considered verified only when three independent signals agree:

1. **Training Partner declares.** The TP (or Training Centre admin) enters trainee, employer, role, CTC, joining date, and optionally an appointment letter into SwiftChat. State on creation: `claimed_unverified`.

2. **Trainee confirms.** SwiftChat sends the trainee a message asking them to independently confirm employment. The trainee responds Yes or No directly from their own SwiftChat session. The training partner cannot see this signal before the trainee submits it.

3. **Employer confirms.** SwiftChat sends an independent confirmation request to the employer's registered contact (not through the training partner). The employer confirms or denies.

## Verification states

| State | Meaning |
|---|---|
| `claimed_unverified` | TP declared. Neither trainee nor employer has confirmed. No payment clock. |
| `partially_verified` | One of {trainee, employer} confirmed; the other still pending. |
| `verified` | TP declaration + trainee confirmation + employer confirmation all consistent. Payment clock starts. |
| `conflicted` | The employer or another signal contradicts the TP declaration. Payment blocked, sent for review. |
| `disputed` | The trainee actively denies the placement happened. Immediate flag; payment blocked. |

## Why this matters

The current system has zero real-time independent checks. The training partner declares, uploads, reports — and gets paid. The Dalberg Cohort 6 report (2026) noted: "SPs have a conflict of interest. Hence, documents uploaded by them might not be independently verifiable."

KSK provides two uncoordinated, independent signals (trainee + employer) at the moment of placement, plus repeated confirmation at day 30/60/90 for retention.
