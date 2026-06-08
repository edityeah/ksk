# Self-hosting KSK (Docker + Cloudflare Tunnel)

KSK runs as a single-container stack behind a Cloudflare Tunnel — no
Render, no Heroku, no public IP, no recurring fees. Mirrors the
`gpcsk` infra pattern.

```
[ public ]  https://ksk.adityeah.ai
              │
              ▼
[ Cloudflare edge ]  (TLS terminates here)
              │  cloudflared tunnel: ksk (UUID 72f14f9a-…)
              ▼
[ your laptop ]  127.0.0.1:8788  ──►  ksk-prod-app container  ──►  ksk-prod-db container
```

## Files

| Path | What it is |
|---|---|
| `Dockerfile` | Single-container build (Node alpine + built SPA + Express) |
| `docker-compose.yml` | Dev stack — Postgres only, host port 5434 |
| `docker-compose.tunnel.yml` | Prod stack — `ksk-prod-db` (5436) + `ksk-prod-app` (8788), both 127.0.0.1-bound |
| `.env.production.example` | Template; copy to `.env.production` (gitignored) and fill in |
| `cloudflared/config.example.yml` | Template for `~/.cloudflared/ksk.yml` |
| `scripts/restore-from-dump.sh` | Restores a `pg_dump` into the prod container |

## One-time setup (already done on the current machine — here for the next box)

### 1. Tooling

```bash
brew install docker cloudflared
# Start Docker Desktop
```

### 2. Cloudflare tunnel

```bash
cloudflared tunnel login                # browser auth, pick adityeah.ai zone
cloudflared tunnel create ksk           # writes ~/.cloudflared/<UUID>.json
cloudflared tunnel route dns --overwrite-dns <UUID> ksk.adityeah.ai
```

Then create `~/.cloudflared/ksk.yml` (template at `cloudflared/config.example.yml`):

```yaml
tunnel: <UUID>
credentials-file: /Users/<you>/.cloudflared/<UUID>.json

ingress:
  - hostname: ksk.adityeah.ai
    service: http://localhost:8788
  - service: http_status:404
```

### 3. Env

```bash
cp .env.production.example .env.production
# Fill in POSTGRES_PASSWORD (openssl rand -hex 24) and JWT_SECRET
# (openssl rand -hex 32). Copy OPENAI_API_KEY / ANAM_* from server/.env.
```

### 4. Seed data (one of two paths)

**Migrating from an existing populated DB** (Render, Neon, etc.):

```bash
# Dump from source (uses postgres:16 docker image — no native pg_dump needed)
docker run --rm postgres:16 pg_dump --no-owner --no-privileges --clean --if-exists \
  'postgresql://USER:PW@HOST/DB' > .local-data/ksk-prod-$(date +%Y%m%d-%H%M).sql

# Bring up the prod db first
docker compose --project-name ksk-prod --env-file .env.production \
  -f docker-compose.tunnel.yml up -d db

# Restore the latest dump
./scripts/restore-from-dump.sh
```

**Fresh database**:

```bash
# Bring everything up first, then exec the seeds:
docker compose --project-name ksk-prod --env-file .env.production \
  -f docker-compose.tunnel.yml up -d
docker exec ksk-prod-app sh -c 'cd server && node src/seed/seed.js'
```

## Day-to-day

```bash
# Full bring-up
docker compose --project-name ksk-prod --env-file .env.production \
  -f docker-compose.tunnel.yml up -d --build

# Start the tunnel (foreground — Ctrl-C to stop)
cloudflared tunnel --config ~/.cloudflared/ksk.yml run ksk

# OR autostart on login (macOS LaunchDaemon)
sudo cloudflared service install

# Stop the stack (keep data)
docker compose --project-name ksk-prod -f docker-compose.tunnel.yml down

# Stop + WIPE DATA
docker compose --project-name ksk-prod -f docker-compose.tunnel.yml down -v

# Rebuild after pulling new code
docker compose --project-name ksk-prod --env-file .env.production \
  -f docker-compose.tunnel.yml up -d --build app
```

## Coexistence

This host already runs `gpcsk` and `wellbeing` on neighbouring ports:

| Stack | DB port | App port | Tunnel |
|---|---|---|---|
| ksk    | 5436 | 8788 | ksk.adityeah.ai |
| gpcsk  | 5435 | 8002 | gpcsk.adityeah.ai |
| wellbeing | (n/a) | 3000 / 8000 | wellbeing.adityeah.ai / api.adityeah.ai |

Each tunnel has its own UUID + `~/.cloudflared/<name>.yml`; all three can run simultaneously.

## What happens to the Render deploy?

The Render service at `ksk-ko64.onrender.com` is now redundant.

- It will keep working until you delete it (Render free tier still costs you the database hours).
- To shut it down: Render dashboard → ksk service → Settings → bottom of page → **Suspend** (reversible) or **Delete** (permanent).
- DNS doesn't need any changes — `ksk.adityeah.ai` is the new canonical URL; `ksk-ko64.onrender.com` was only ever the Render-default URL with no custom DNS attached.

## Backups

The Postgres data lives in the Docker volume `ksk-prod_ksk-prod-pgdata` on
your laptop. Use the helper script:

```bash
# Take a fresh snapshot now (auto-timestamps + auto-prunes >14 old backups)
./scripts/backup-now.sh

# Or pass an explicit output path
./scripts/backup-now.sh /tmp/ksk-pre-rebuild.sql

# Restore any backup
./scripts/restore-from-dump.sh .local-data/ksk-docker-20260608-1448.sql
```

`backup-now.sh` writes to `.local-data/` (gitignored) and is cron-friendly —
add it to your crontab for daily snapshots:

```cron
0 3 * * *  cd /Users/adityeahspare/Documents/NSDC\ X\ CG/ksk && ./scripts/backup-now.sh >> backup.log 2>&1
```

**Off-tree safety copies.** For real safety, copy the latest dump out of the
repo tree periodically (so a `git clean -fdx` or accidental `rm -rf .` can't
take it with the rest of the working copy):

```bash
cp .local-data/ksk-docker-*.sql ~/Documents/ksk-backups/
```

**Restore verification.** The dumps round-trip cleanly into a scratch
container (tested via `postgres:17-alpine` on port 5499). To re-verify:

```bash
docker run -d --rm --name ksk-restore-test \
  -e POSTGRES_USER=ksk -e POSTGRES_PASSWORD=test -e POSTGRES_DB=ksk \
  -p 127.0.0.1:5499:5432 postgres:17-alpine
sleep 5
docker exec -i ksk-restore-test psql -v ON_ERROR_STOP=1 -U ksk -d ksk \
  < .local-data/ksk-docker-LATEST.sql
docker exec ksk-restore-test psql -U ksk -d ksk -c \
  'SELECT count(*) FROM "User";'
docker stop ksk-restore-test
```

Run this before any disruptive change (schema migration, container rebuild
with `down -v`, OS reinstall, laptop swap).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Bind for 127.0.0.1:8788 failed: port is already allocated` | A previous `ksk-prod-app` is still up, or some other process is on 8788 | `docker ps \| grep ksk` to find it; `docker rm -f ksk-prod-app` |
| `https://ksk.adityeah.ai` → "Tunnel error 1033" | Tunnel daemon not running | `cloudflared tunnel list` (looking for active connections); start with `cloudflared tunnel --config ~/.cloudflared/ksk.yml run ksk` |
| App returns 500 from every API call | Schema drift between dump and current Prisma schema | `docker exec ksk-prod-app sh -c 'cd server && npx prisma db push'` |
| Login works but `/api/mentors` returns 401 | Stale browser token (JWT_SECRET changed on rebuild) | Hard refresh (`Cmd+Shift+R`) — the AppContext bounces to splash automatically |
