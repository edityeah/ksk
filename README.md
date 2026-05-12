# KSK — Kaushal Samiksha Kendra

National skilling Monitoring & Evaluation command centre on SwiftChat. Forked from the SwiftChat v3 (VSK Gujarat) prototype, retargeted to the NSDC / MSDE skilling ecosystem.

**Core thesis:** maker-checker verification — no single actor controls a complete record. Trainee, employer, training partner each confirm independently inside SwiftChat. Solves the 22–27% placement-discordance problem observed in Cohorts 1–4 of the Skill Impact Bond.

---

## Repository layout

```
ksk/
├── web/          # Vite + React 18 + Tailwind frontend (SwiftChat fork)
├── server/       # Node + Express + Prisma + Postgres backend + OpenAI integration
├── docs/         # design docs, specs, knowledge base seeds for RAG
└── render.yaml   # Render Blueprint — provisions everything in one click
```

## Deploy to Render (single service, one click)

One Render web service runs everything. The Express server serves `/api/*` AND the
built Vite SPA from `/` in production. Postgres is provisioned alongside via the
Blueprint.

### 1. Push to GitHub (already done)

Repo: [edityeah/ksk](https://github.com/edityeah/ksk).

### 2. Create the Render Blueprint

1. Sign in to [render.com](https://render.com) (free tier is enough).
2. **New +** → **Blueprint** → connect your GitHub → pick `edityeah/ksk`.
3. Render reads `render.yaml` and shows: one web service (`ksk`) + one Postgres database (`ksk-db`).
4. Click **Apply**. Render provisions both, auto-wires `DATABASE_URL`, and starts the first build.

Build takes ~5 minutes (npm install + Vite build + Prisma generate).

### 3. Set OPENAI_API_KEY

The Blueprint marks `OPENAI_API_KEY` as `sync: false`, so add it manually:

1. Render dashboard → `ksk` service → **Environment** → **Add Environment Variable**
2. Key `OPENAI_API_KEY` · Value your real `sk-…` key
3. **Save Changes** — Render rebuilds.

### 4. Seed the database once

After the first successful deploy, the schema is already pushed (the start command runs `prisma db push`). Now seed demo data — open Render's **Shell** tab on the `ksk` service:

```bash
cd server
npm run db:seed              # seeds 90 demo users + scenario data
npm run rag:ingest           # optional: embed the markdown knowledge base
```

### 5. Open the URL

Render gives you `https://ksk.onrender.com` (or similar). Splash → language → login → home should all work. Demo accounts: see [`docs/demo-credentials.md`](./docs/demo-credentials.md).

**Free-tier caveats:** Render's free web service spins down after 15 min idle (~60 s cold start on next hit). Free Postgres is 1 GB and expires after 30 days. For a real funder demo, upgrade the web service to **Starter ($7/mo)** so it stays warm, and either keep paying for Postgres or migrate to free [Neon](https://neon.tech) (no expiration). Just swap `DATABASE_URL` in Render's env vars and `prisma db push` again.

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
