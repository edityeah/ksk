# KSK — Kaushal Samiksha Kendra

National skilling Monitoring & Evaluation command centre on SwiftChat. Forked from the SwiftChat v3 (VSK Gujarat) prototype, retargeted to the NSDC / MSDE skilling ecosystem.

**Core thesis:** maker-checker verification — no single actor controls a complete record. Trainee, employer, training partner each confirm independently inside SwiftChat. Solves the 22–27% placement-discordance problem observed in Cohorts 1–4 of the Skill Impact Bond.

---

## Repository layout

```
ksk/
├── web/         # Vite + React 18 + Tailwind frontend (SwiftChat fork)
├── server/      # Node + Express + Prisma + SQLite backend + OpenAI integration
└── docs/        # design docs, specs, knowledge base seeds for RAG
```

## Quick start

```bash
# Backend (terminal 1)
cd server
npm install
npm run db:push           # apply Prisma schema to local SQLite
npm run db:seed           # seed users + demo data
npm run dev               # starts Express on :8787

# Frontend (terminal 2)
cd web
npm install
npm run dev               # starts Vite on :5173
```

Open `http://localhost:5173`.

## Demo credentials

See `docs/demo-credentials.md`.

| Role | Login |
|---|---|
| Trainee | Phone `9876543210` OTP `1234` — or Aadhaar `123456789012` OTP `123456` |
| Trainer | Phone `9000000010` OTP `1234` — or SIDH `TRN-MB-1001` / `Demo@123` |
| Training Centre | Phone `9000000001` OTP `1234` |
| Training Partner | Phone `9000000002` OTP `1234` |
| Assessor | Phone `9000000003` OTP `1234` |
| Sector Skills Council | Phone `9000000004` OTP `1234` |
| Employer | Phone `9000000005` OTP `1234` |
| NSDC Officer | Phone `9000000006` OTP `1234` |
| Funder | Phone `9000000007` OTP `1234` |
| Stipend Officer | Phone `9000000008` OTP `1234` |

## Architecture overview

See `docs/architecture.md` for the full design — actor model, screen graph, canvas system, NLP pipeline, data model, RAG knowledge base, and the maker-checker verification state machine.
