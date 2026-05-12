# KSK — Kaushal Samiksha Kendra

National skilling Monitoring & Evaluation command centre on SwiftChat. Forked from the SwiftChat v3 (VSK Gujarat) prototype, retargeted to the NSDC / MSDE skilling ecosystem.

**Core thesis:** maker-checker verification — no single actor controls a complete record. Trainee, employer, training partner each confirm independently inside SwiftChat. Solves the 22–27% placement-discordance problem observed in Cohorts 1–4 of the Skill Impact Bond.

---

## Repository layout

```
ksk/
├── web/         # Vite + React 18 + Tailwind frontend (SwiftChat fork)
├── server/      # Node + Express + Prisma + Postgres backend + OpenAI integration
├── api/         # Vercel serverless entry — wraps the Express app
├── docs/        # design docs, specs, knowledge base seeds for RAG
└── vercel.json  # Vercel deploy config
```

## Deploy to Vercel

The entire app — frontend SPA + serverless API — runs on a single Vercel project.

### 1. Provision a Postgres database

The cheapest path is **[Neon](https://neon.tech)** (free tier, instant, includes pgvector):

```text
1. Sign up at neon.tech → New Project → name "ksk"
2. Copy the connection string (Pooled connection recommended for serverless)
```

You'll get a URL like:
`postgresql://USER:PASSWORD@ep-xyz-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 2. Connect the GitHub repo to Vercel

```text
1. vercel.com → Add New Project → import edityeah/ksk
2. Framework Preset: Other (Vercel auto-detects vercel.json)
3. Root Directory: .  (project root)
```

### 3. Environment variables (Vercel dashboard → Settings → Environment Variables)

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon Pooled connection string |
| `JWT_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `OPENAI_API_KEY` | your real OpenAI key (must be valid) |
| `OPENAI_CHAT_MODEL` | `gpt-4o` |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` |
| `RATE_LIMIT_PER_HOUR` | `50` |

### 4. Deploy + run the migrations once

After the first deploy succeeds, open a one-off shell (`vercel env pull` locally, then):

```bash
cd server
npm install
npx prisma db push           # creates all tables in Neon
npm run db:seed              # seeds 10 demo users + scenario data
npm run rag:ingest           # optional: embed the markdown knowledge base
```

(Or just run `prisma db push` + seed against the same DATABASE_URL from your laptop — Neon accepts external connections.)

Subsequent commits to `main` will auto-deploy.

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
