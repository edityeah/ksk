# Retention Check-in Workflow

## Schedule

On day 30, day 60, and day 90 after the reported joining date, KSK sends an automated check-in to the trainee through SwiftChat:

- The trainee confirms continued employment with a single tap (Yes / Not anymore / Switched).
- Optionally the trainee can upload a salary slip photo. KSK's OCR extracts employer name, gross salary, PF number and checks consistency with the declared placement.

At day 90, the **employer** also receives a separate, independent confirmation request. This is the milestone that currently requires an independent firm to call 793 trainees by phone months after the fact. KSK does it automatically and in real time, from both sides simultaneously.

## States

| State | Meaning |
|---|---|
| `pending` | Check-in due but no response yet. |
| `trainee_only` | Trainee responded; employer has not yet (or it's a 30/60 day milestone, not 90). |
| `employer_only` | Employer responded; trainee has not yet. |
| `dual_confirmed` | Both trainee and employer responded consistently. This is the retention KPI funders count. |
| `conflicted` | Trainee and employer responses disagree. Flagged. |

If the trainee stops responding at day 60, the record is flagged immediately and a field agent is assigned. The problem is surfaced in real time — not discovered three months later.

## Why this matters

Retention is the most expensive outcome to verify today. Phone surveys are slow, expensive, and only sample a fraction of trainees. KSK measures every trainee, every milestone, with two independent signals, automatically.
