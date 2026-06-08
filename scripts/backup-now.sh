#!/usr/bin/env bash
# Take a timestamped pg_dump from the live ksk-prod-db container and write it
# to .local-data/ . Idempotent, side-effect-free, safe to run while the stack
# is up (Postgres uses a snapshot transaction, so the dump is consistent
# even with concurrent writes).
#
# Usage:
#   ./scripts/backup-now.sh            # writes .local-data/ksk-docker-YYYYMMDD-HHMM.sql
#   ./scripts/backup-now.sh /path.sql  # explicit output path
#
# Pairs with scripts/restore-from-dump.sh — same format (--clean --if-exists
# --no-owner --no-privileges), so you can restore any of these dumps with a
# single command.
#
# Cron-friendly: set up a daily backup with
#   0 3 * * *  cd /path/to/ksk && ./scripts/backup-now.sh >> backup.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/.local-data"

OUT="${1:-$ROOT/.local-data/ksk-docker-$(date +%Y%m%d-%H%M).sql}"

if ! docker ps --format '{{.Names}}' | grep -q '^ksk-prod-db$'; then
  echo "FATAL: ksk-prod-db container is not running — nothing to back up." >&2
  exit 1
fi

echo "[backup] dumping ksk-prod-db → $OUT"
docker exec ksk-prod-db pg_dump \
  --no-owner --no-privileges --clean --if-exists \
  -U ksk ksk > "$OUT"

BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "[backup] wrote $BYTES bytes"

# Quick sanity: every dump should have all 29 KSK tables + at least one user.
TABLES=$(grep -cE '^CREATE TABLE public\.' "$OUT" || true)
USERS_LINE=$(grep -A50 '^COPY public."User"' "$OUT" | sed '/^\\\.$/q' | wc -l)
echo "[backup] tables=$TABLES  user-rows≈$((USERS_LINE - 2))"
[ "$TABLES" -lt 29 ] && echo "[backup] WARNING: expected ≥29 tables, got $TABLES — dump may be partial" >&2

# Keep the last 14 daily backups; prune older ones to avoid the dir growing
# unboundedly under cron. Per-file size is small (~200KB) but it adds up.
KEEP=14
PRUNED=$(ls -1t "$ROOT/.local-data"/ksk-docker-*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -I{} sh -c 'rm -f "{}"; echo {}' | wc -l | tr -d ' ')
[ "$PRUNED" -gt 0 ] && echo "[backup] pruned $PRUNED old backups (keep newest $KEEP)"

echo "[backup] done."
