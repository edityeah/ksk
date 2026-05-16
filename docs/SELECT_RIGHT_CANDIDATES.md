# Select Right Candidates — Strategy

Internal strategy doc. Not for the prototype UI.

This is the second step in the 7-step methodology, after Secure Demand. It runs on the Training Centre side, with the Mobilizer as a first-class collaborator and the Training Partner HQ as the auditor.

---

## Why this step matters

This is where AMBER's "select for intrinsic motivation, not just eligibility" principle lands operationally. In real life, this is where most failure originates — bad mobilization brings in people who don't actually want the job; centres rubber-stamp because their payment depends on filling seats; nobody has shown the candidate what the job actually looks like. By the time we hit placement, the cohort isn't trainable.

The mobilizer is the most important actor here, but the least visible in current MIS systems. We need to make the mobilizer a tracked entity, link every candidate back to a named mobilizer, and pay them on **downstream outcomes** — retention at day 90 — not on intake headcount.

---

## Actors

| Actor | Who they are | Where they live | What they own |
|---|---|---|---|
| **Mobilizer** | Field person (often contracted by TP or TC) who goes to villages / colleges / job fairs to source candidates | Mobile-first, lives in the area | Outreach + intake form |
| **Candidate / Applicant** | Person who has expressed interest, not yet enrolled | SwiftChat | Their application + responses |
| **TC Counsellor** | Centre staff who screens and selects | TC login | Motivation review, assessment, decision |
| **TC Centre Head** | Sunita Devi at Patna | TC login | Sign-off on selection |
| **Trainer** | Sometimes runs the field immersion day | (no separate login for now) | — |
| **Employer branch contact** | Hosts the field immersion at their workplace | WhatsApp / SwiftChat reply | Confirms candidates visited |
| **TP HQ** | Priya Kohli at Magic Bus | TP login | Selection policy, mobilizer registry, audit |

---

## Activity flow (chronological)

### Phase A · Mobilization Brief (TC → Mobilizer)
The TC tells the mobilizer what to look for. This brief is auto-derived from the Step 1 demand:
- Roles & seat count per role (from confirmed allocations)
- Eligibility: age, qualification, gender targets, social-category targets, language
- Geographic area (which pin codes to cover)
- Timeline (when batch starts, when intake closes)
- Employer-ranked top skills (so the mobilizer can hint at what kind of person to find)
- CTC band — *be honest with candidates; salary surprises later cause day-30 attrition*

The mobilizer accepts the brief; this becomes their **active brief**.

### Phase B · Field Outreach (Mobilizer)
- Mobilizer visits the area, talks to candidates
- Carries a **role pitch deck** (auto-generated from the brief): 1 page per role in the local language with day-in-the-life photos/videos, CTC, work conditions, the harder parts of the job
- Each candidate hears the realistic version: a hotel F&B candidate is told "you will clean tables, work evenings and Sundays, stand for 8 hours, wear a uniform" — not just "hospitality industry, good growth prospects"

### Phase C · Application Capture (Mobilizer)
- Mobilizer enters the candidate on a mobile-first form (10–15 fields max)
- Captures: name, age, gender, social category, education, family income tier, Aadhaar (optional), pincode, phone, **role they're applying for**, **why this role** (1–2 lines), **other roles they considered**
- Candidate gets an SMS / WhatsApp acknowledgement with their CandidateID
- KSK records the mobilizer–candidate link permanently

### Phase D · Role-specific Motivation Questions (Candidate via SwiftChat)
- The candidate gets a SwiftChat ping with 4–6 questions specific to the role
- Examples:
  - GDA: "What does a typical day in a hospital look like to you?" + "Are you OK with night shifts?" + "Do you mind seeing patients in pain?"
  - F&B Steward: "Are you comfortable serving food and clearing tables?" + "Can you work weekends?" + "Have you ever held a hospitality-style customer interaction?"
  - Production Operator: "Have you used any machinery before?" + "Are you OK standing 8 hours?" + "Do you mind shift rotations?"
- LLM-scored on a rubric for genuineness (templated answers like "I am hard working and dedicated" get low scores; specific answers about the actual work get high scores)
- Some questions are text, some are 1-tap multiple choice

### Phase E · Counselling Call (TC Counsellor)
- TC counsellor sees the application + motivation answers in their inbox
- Calls the candidate (phone or video on SwiftChat) — 5–10 minute conversation
- Logs: motivation rating (1–5), fit notes, red flags
- Schedules the candidate for the next field immersion day (or rejects with a reason)

### Phase F · Field Immersion (TC + Employer)
- TC organises group visits to actual employer workplaces
- A van takes 10–20 candidates to a real hospital / hotel / factory / branch
- Candidate sees the work environment, talks to current employees, watches the workflow
- KSK captures: visit date, location, attendance via Aadhaar OTP + selfie photo
- At end of day, candidate makes their own decision: "I want to continue" / "Not for me"
- The **post-immersion opt-out is a positive M&E signal** — it's pre-batch attrition you saved. Better the candidate self-selects out now than drops out at week 6.

### Phase G · Entry Assessment (TC + optional independent assessor)
- Candidate sits a structured entry assessment
- Two parts:
  - **Aptitude**: basic math, reading comprehension, logic — NSQF-level appropriate
  - **Role-specific prerequisite**: typing speed for BPO, motor task for Production, sales role-play for Retail, simple BP measurement walk-through for GDA
- Scored either auto (quizzes) or by a verified assessor (practical tasks, video-recorded)
- The system enforces a **pass-rate band per role/centre**: above 90% sustained = rubber-stamping flag

### Phase H · Selection Decision (Centre Head sign-off)
- TC counsellor compiles: motivation rating + immersion attendance + assessment score + demographic targets
- Recommendation: Accept / Waitlist / Reject (with reason code from a fixed list: under-qualified, low motivation, geographic mismatch, family disapproval, alternate opportunity, conduct concern, immersion no-show, scheme demographic-target reasons)
- Centre Head reviews and signs off
- Candidate notified via SwiftChat — "Welcome, your batch starts on X" or "Not a fit; here's another role you might consider" or "Waitlisted, we'll let you know in 7 days"

### Phase I · Mobilizer Feedback Loop
- The mobilizer immediately sees the outcome of every candidate they brought
- Their dashboard shows the full funnel: mobilized → applied → motivation-passed → immersion-attended → assessment-passed → selected → trained → certified → placed → **retained at 90**
- **Payout is tied to retention at 90, not to intake.** A mobilizer who brings 100 candidates of whom 80 retain at day 90 is paid more than one who brings 500 of whom 30 retain.
- A mobilizer with consistently low pass rates / low retention gets flagged for retraining or contract termination.

---

## Signals KSK captures

| Phase | Signal | What it tells | Flag threshold |
|---|---|---|---|
| Brief | Brief acceptance time | Mobilizer responsiveness | > 48 hrs idle |
| Outreach | Mobilized / pin code | Geographic spread | All from one village = brokering risk |
| Outreach | Mobilized → applied | Mobilizer pitch quality | < 30% suspicious |
| Application | Motivation question completion | Mobilizer rigour | < 70% complete |
| Application | "Why this role" LLM rigour score | Quality of intent | Distribution-watched |
| Counselling | Counsellor call completion | Centre rigour | < 80% means counselling skipped |
| Counselling | Motivation rating distribution | Centre rigour | Everyone rated 5/5 → rubber-stamp |
| Immersion | Immersion completion rate | Logistics + interest | < 60% = poor logistics or weak interest |
| Immersion | Post-immersion opt-out rate | **Honest self-selection** | 10–20% is healthy |
| Assessment | Pass rate per centre | Selection rigour | **> 90% sustained = flag rubber-stamping** |
| Assessment | Pass rate per mobilizer's candidates | Mobilizer quality | Below 40% = poor sourcing |
| Selection | Selection ratio | Bar at the centre | > 80% acceptance = low bar |
| Selection | Rejection reason mix | Process clarity | Mostly "no-show" = logistics problem |
| Demographic | Women %, social category %, district mix | Scheme compliance | Against scheme targets |
| Outcome (later) | Mobilizer's D90-retention rate | The most honest mobilizer metric | Pay tied to this |

---

## Platform surfaces

### Training Centre login — new tiles
1. **Mobilization Brief** — set/edit per-role seats, eligibility, timeline, area; auto-pulls from Demand Board; share with attached mobilizers
2. **Mobilizer Performance** — list of mobilizers attached, with funnel + downstream retention rates; assign mobilizers to briefs
3. **Application Inbox** — incoming applications, filter by role/mobilizer/motivation-score, batch-assign to counsellors
4. **Counselling Queue** — applications needing review, log motivation rating + notes
5. **Field Immersion Scheduler** — schedule immersion days at employer sites (links back to Step 1 branch contacts), attendance capture
6. **Entry Assessment Console** — administer/score assessments
7. **Selection Decisions** — accept/waitlist/reject with reason codes, Centre Head sign-off
8. **Selection Quality** — KPI dashboard: pass rate, selection ratio, immersion completion, demographic mix, with click-to-drill (same pattern as Demand Board)

### Mobilizer login (NEW — proper role)
1. **Active Briefs** — accepted briefs with seat counts and timelines
2. **Add Applicant** — fast mobile-first intake form (camera capture for Aadhaar, voice memo for motivation note)
3. **My Pipeline** — funnel per brief: mobilized → applied → immersion-attended → selected → certified → placed → **retained**
4. **Earnings** — outcome-based statement, payouts tracked against D90 retention
5. **Calendar** — upcoming immersion days, assessment dates, batch starts

### TP HQ — new tiles / sections
1. **Mobilizer Registry** — all mobilizers across centres, sortable by downstream conversion
2. **Selection Quality Audit** — cross-centre comparison, rubber-stamping flags
3. **Selection Policy** — set thresholds (pass-rate caps, motivation-score minimums, immersion-mandatory roles)

---

## Step 1 → Step 2 chain (how Demand drives Selection)

This is the integration story for the funder:

> The mobilization brief is not invented in a vacuum — it inherits from the demand we secured.

When the TC opens a new Mobilization Brief, the system pre-fills:
- **Roles to mobilize for** = roles with confirmed allocations from Step 1
- **Seat target per role** = confirmed slots (or planned-enrolment per role from the TC's plan)
- **Skill requirements for entry assessment** = top-ranked skills from the employer's skill demand sheet (Step 1)
- **CTC to disclose to candidates** = MoU's CTC band
- **Field immersion targets** = the branch contacts captured in Step 1
- **Role pitch content** = generated from the employer's skill demand sheet ("HDFC needs people who can do KYC, handle customer queries in Hindi+English, use Finacle")

So selection is *purpose-aligned with the actual jobs waiting at the end*. No more training in a vacuum.

---

## Decisions to lock before we build

1. **Mobilizer login — first-class role, or tracked inside TC?**
   - First-class: a real Mobilizer login on SIDH with their own canvas. More authentic, captures more signal, but ~2x build cost.
   - Inside TC: TC adds mobilizers as named entities and logs candidates on their behalf. Faster MVP, no separate identity for the mobilizer.
   - **Recommendation: First-class.** The mobilizer is the missing actor in AMBER's story; you'll want to demo their pipeline funnel.

2. **Motivation question grading — LLM or static rubric?**
   - LLM (Saathi) reads the text answer and scores rigour 1–5.
   - Static rubric: number of words, presence of role-specific terms, language detected.
   - **Recommendation: LLM-graded with a static fallback.** This is the kind of nuanced thing Saathi is here for.

3. **Field immersion — mandatory per role, or optional?**
   - Mandatory for all roles that have a physical work component (most of ours)
   - Skipped for purely digital roles
   - **Recommendation: Mandatory by default, can be waived by Centre Head with a reason code logged.**

4. **Mobilizer payout — show in the demo, or just track?**
   - Show: build a payout statement with status (pending/disbursed), tied to D90 retention
   - Track only: just compute the conversion stats; payment is offline
   - **Recommendation: Track + show pending statement. We don't have to actually disburse, but showing it makes the funder narrative concrete.**

---

## Out of scope at MVP

- **Aadhaar-based duplicate detection across TPs** (a candidate sourced by 2 mobilizers from different TPs would be flagged)
- **Mobilizer-employer direct comms** — they go through TC for now
- **Multi-mobilizer attribution** (same candidate sourced by 2 mobilizers, who gets credit?)
- **Automated assessment proctoring** (face detection, screen recording for cheating) — keep stub
- **GST-linked mobilizer payouts via PFMS** — track only, no real payment rail

---

## Build order (once decisions are locked)

1. Mobilizer fixture (5–10 named mobilizers across centres with their geographic areas)
2. Mobilizer login + canvas (Active Briefs, Add Applicant, My Pipeline)
3. TC's Mobilization Brief canvas (auto-pulls from Demand Board)
4. TC's Application Inbox + Counselling Queue
5. TC's Field Immersion Scheduler
6. TC's Entry Assessment Console
7. TC's Selection Decisions screen + reason codes
8. TC's Selection Quality dashboard (with clickable KPIs, same pattern as Demand Board)
9. TP HQ's Mobilizer Registry + Selection Quality Audit
10. Wire signals into the funder dashboard (later)
