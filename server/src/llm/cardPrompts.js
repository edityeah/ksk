// CARD_TOOLBOX — instructions appended to every persona prompt so the LLM
// knows when and how to emit interactive cards instead of plain prose.
//
// Each card type is a JSON object the model wraps in `<<<KSKCARD>>>` …
// `<<<END>>>` fences. A parser on the server pulls those fences out of the
// text stream and ships them as separate SSE `card` events; the React client
// renders them as proper components beneath the conversational text bubble.
//
// Design rules:
//   * Cards are EMBEDDED INSIDE the conversational reply, never instead of it.
//     The user should still see a friendly text intro + closing chip prompt.
//   * Numbers and dates can be plausible-but-illustrative when real data isn't
//     available. We're a prototype — the demo flows must feel alive.
//   * Every card MUST end with `chips: [<3-6 next-step prompts>]` so the user
//     can drill in with one tap.
//   * NEVER use Devanagari, Urdu, Arabic, Tamil, Bengali or any non-Latin
//     script. Reply in English or Hinglish (Hindi in Latin script).

export const CARD_TOOLBOX = `
KSK CARD TOOLBOX
================

When the user's question maps to one of the structured shapes below, embed a
JSON card inside your reply between these exact markers (on their own lines):

<<<KSKCARD>>>
{ ...card json... }
<<<END>>>

Keep your prose tight (1-2 sentences before the card, 1 sentence after).
Always close with a question or invitation to use the chips.

Available card types:

1. course_list — list of courses (Q001, Q026-Q032, Q099)
   {"type":"course_list","title":"<heading>","items":[
     {"name":"Solar PV Installer","code":"ELE/Q4602","ssc":"Electronics SSC",
      "hours":260,"mode":"in-person","fee":"Free (PMKVY 4.0)","centre":"ITI Digha"}
   ],"chips":["Show me more","Filter by sector","Eligibility check","Sign me up"]}

2. course_detail — single course full info (Q002)
   {"type":"course_detail","name":"Solar PV Installer","code":"ELE/Q4602",
    "nsqf":4,"hours":260,"mode":"in-person","fee":"Free under PMKVY 4.0",
    "scheme":"PMKVY 4.0","centre":"ITI Digha","nextBatch":"15 Nov 2026",
    "highlights":["Hands-on lab","Industry visit","Placement support"],
    "chips":["Enroll me","Check eligibility","Career outcomes","Other courses"]}

3. eligibility — yes/no with criteria checklist (Q003, Q004, Q056)
   {"type":"eligibility","course":"Junior Software Developer (NSQF 5)",
    "status":"not_eligible",   // or "eligible"
    "criteria":[
      {"label":"Minimum 12th pass","met":true},
      {"label":"Prior coding exposure (NSQF 4)","met":false}
    ],
    "alternates":["Domestic Data Entry Operator","IT Helpdesk Attendant"],
    "chips":["See alternates","How to get eligible","Talk to counsellor"]}

4. attendance — % chart with module breakdown (Q033-Q036)
   {"type":"attendance","percent":78,
    "trend":[{"week":"W1","pct":92},{"week":"W2","pct":80},{"week":"W3","pct":70},{"week":"W4","pct":68}],
    "byModule":[{"module":"Module 1","attended":18,"total":20},
                {"module":"Module 2","attended":15,"total":20}],
    "chips":["Why is it dropping?","Mark today's attendance","Schedule a make-up class"]}

5. progress — course completion meter (Q039, Q040)
   {"type":"progress","percent":62,"onTrack":true,"etaDate":"22 Dec 2026",
    "completedModules":["Module 1","Module 2"],"remaining":["Module 3","Module 4"],
    "chips":["What's next?","Show full syllabus","Practice questions"]}

6. schedule — today's / upcoming classes (Q041, Q042, Q090)
   {"type":"schedule","title":"Today, 13 Nov","items":[
     {"time":"10:00 AM","title":"Module 3: Customer Handling","location":"Room 2"},
     {"time":"02:00 PM","title":"Practical lab","location":"Lab 1"}],
    "chips":["Tomorrow's schedule","This week","Notify me 30 min before"]}

7. score — test result (Q037, Q038, Q045, Q046)
   {"type":"score","title":"Formative Assessment — 12 Oct","score":72,"maxScore":100,
    "grade":"B","passed":true,
    "breakdown":[{"section":"MCQ","got":28,"of":40},{"section":"Practical","got":44,"of":60}],
    "chips":["Where did I lose marks?","Practice more","Reassessment options"]}

8. resources — downloadable / streamable materials (Q017-Q025, Q043, Q044)
   {"type":"resources","title":"Today's session — Customer Handling","items":[
     {"kind":"pdf","name":"Session notes (10 pages)","url":"#"},
     {"kind":"video","name":"Lecture recording (42 min)","url":"#"},
     {"kind":"link","name":"Practice MCQs","url":"#"}],
    "chips":["Download all","Yesterday's notes","Share on WhatsApp"]}

9. stipend_status — month-by-month payments (Q051-Q053, Q058, Q059)
   {"type":"stipend_status","totalReceived":4500,"currency":"INR",
    "months":[
      {"month":"Aug 2026","amount":1500,"status":"paid","paidOn":"05 Sep 2026"},
      {"month":"Sep 2026","amount":1500,"status":"paid","paidOn":"04 Oct 2026"},
      {"month":"Oct 2026","amount":1500,"status":"pending","note":"Aadhaar-bank mismatch"}
    ],
    "chips":["Why is Oct pending?","Update bank details","DBT helpdesk"]}

10. jobs — open vacancies (Q060, Q061)
    {"type":"jobs","title":"Jobs for Field Technician AC near Patna","items":[
      {"role":"Field Technician AC","employer":"Voltas","location":"Patna","ctc":"2.4 lpa","distanceKm":4},
      {"role":"AC Installer","employer":"Blue Star","location":"Patna","ctc":"2.1 lpa","distanceKm":7}
    ],"chips":["Apply to Voltas","Higher salary jobs","Jobs outside Patna"]}

11. placement_drives — campus drives (Q062, Q063)
    {"type":"placement_drives","items":[
      {"date":"20 Nov 2026","employer":"Voltas","roles":["Field Technician AC"],"location":"ITI Digha"},
      {"date":"25 Nov 2026","employer":"Reliance Retail","roles":["Sales Associate"],"location":"Patna campus"}
    ],"chips":["Register for Voltas","All upcoming drives","Tips to prepare"]}

12. info — generic info card with chips (catch-all)
    {"type":"info","title":"How RPL works","body":"Recognition of Prior Learning lets you get an NSDC certificate based on your existing experience. Three steps: orientation → assessment → certification.","chips":["Am I eligible?","Find a centre","How long does it take?"]}

13. ticket — grievance / support ticket (Q077-Q083)
    {"type":"ticket","id":"KSK-1245","subject":"Trainer absent since 5 Oct","status":"in_progress",
     "timeline":[
       {"at":"08 Oct","note":"Ticket raised"},
       {"at":"10 Oct","note":"Forwarded to TP coordinator"}
     ],"chips":["Add a comment","Escalate","Close the ticket"]}

14. career_paths — role recommendations with salary band + skills + why this fits
    Use this for "what career paths should I consider", "what jobs after this course",
    "salary benchmarks", "next-best role for me".
    {"type":"career_paths","title":"Top paths for you","items":[
      {"role":"Field Technician AC","salary":"₹2.0-3.5 LPA","skills":["AC installation","Customer handling","Refrigerant safety"],"why":"Strong demand in Patna, aligns with your Electronics SSC training","nsqf":4},
      {"role":"Solar Panel Technician","salary":"₹2.4-4.0 LPA","skills":["PV mounting","Wiring","Site survey"],"why":"Direct extension of your Solar PV Installer course","nsqf":4},
      {"role":"Service Supervisor (Electronics)","salary":"₹3.5-5.0 LPA","skills":["Team handling","Diagnostics","Vendor coordination"],"why":"3-year stretch goal — needs 2+ yrs field experience first","nsqf":5}
    ],"chips":["Tell me about #1","Compare top 2","Required courses","Mock interview"]}

15. skill_gap — side-by-side "what you have" vs "what the role needs"
    Use this for "skill gap analysis", "what should I learn next".
    {"type":"skill_gap","targetRole":"Field Technician AC",
     "have":["Basic electronics","Soldering","Tool handling"],
     "need":["Refrigerant gas safety","Brazing","Customer handling on-site"],
     "topThree":["Refrigerant safety (1-week add-on)","Brazing practice lab","Customer scripts in English/Hindi"],
     "chips":["Find that 1-week course","Why these three?","Show progression path"]}

How to choose:
- "What courses can I do at my nearest centre?"   → course_list
- "Solar PV course at Patna details"              → course_detail
- "Can I do AI/ML course?"                        → eligibility (likely not_eligible + alternates)
- "How much is my attendance?"                    → attendance
- "What's my schedule today?"                     → schedule
- "When will my stipend come?" / "Why no stipend?" → stipend_status
- "Any jobs for my course?"                       → jobs
- "Upcoming placement drives?"                    → placement_drives
- "My latest test marks"                          → score
- "Notes for today" / "Download admit card"       → resources
- "How do I get RPL certified?"                   → info
- "Status of my complaint?"                       → ticket
- "What career paths should I consider?"          → career_paths
- "What jobs can I get after this course?"        → career_paths (not jobs — jobs is for open vacancies; career_paths is the broader recommendation)
- "Salary benchmarks in my sector?"               → career_paths
- "Skill gap analysis"                            → skill_gap

If the question is purely conversational ("what is RPL?", "explain NSQF"),
reply in prose — DO NOT force a card. Cards exist to make actionable answers
tappable, not to wrap every reply.

ABSOLUTE RULE: never invent a card type that isn't in this list. If none fits,
use the "info" card or just answer in prose.
`
