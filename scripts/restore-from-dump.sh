#!/usr/bin/env bash
# Restore the latest pg_dump from .local-data/ into the prod Docker
# Postgres container (ksk-prod-db). Idempotent: --clean --if-exists in
# the dump itself means a re-run wipes existing tables before reloading.
#
# Usage:
#   ./scripts/restore-from-dump.sh             # picks latest .sql in .local-data/
#   ./scripts/restore-from-dump.sh path/to.sql # explicit file
#
# Pre-requisites:
#   - docker compose --project-name ksk-prod -f docker-compose.tunnel.yml up -d db
#   - POSTGRES_PASSWORD set in .env.production (compose-mounted into db)
#   - The dump file was produced with --clean --if-exists (otherwise
#     restore against a populated DB will fail on duplicate-key inserts)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP="${1:-}"

if [[ -z "$DUMP" ]]; then
  DUMP=$(ls -t "$ROOT/.local-data"/ksk-prod-*.sql 2>/dev/null | head -1 || true)
fi
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "FATAL: no dump file found. Place a .sql dump in .local-data/ or pass path as \$1." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^ksk-prod-db$'; then
  echo "FATAL: ksk-prod-db container is not running."
  echo "       Bring the prod db up first:"
  echo "       docker compose --project-name ksk-prod --env-file .env.production -f docker-compose.tunnel.yml up -d db"
  exit 1
fi

echo "[restore] using dump: $DUMP ($(wc -c < "$DUMP" | tr -d ' ') bytes)"
echo "[restore] streaming into ksk-prod-db…"
# psql -v ON_ERROR_STOP=1 makes the whole restore atomic — if any
# statement fails, the script exits non-zero instead of silently
# leaving the DB half-loaded.
docker exec -i ksk-prod-db psql -v ON_ERROR_STOP=1 -U ksk -d ksk < "$DUMP" \
  | grep -vE '^(SET|COMMENT|ALTER|CREATE|DROP|GRANT|REVOKE|--)' \
  | head -40 || true

echo ""
echo "[restore] verifying row counts…"
docker exec ksk-prod-db psql -U ksk -d ksk -c "
  SELECT 'User' tbl, count(*) n FROM \"User\"
  UNION ALL SELECT 'Sector',         count(*) FROM \"Sector\"
  UNION ALL SELECT 'MentorProfile',  count(*) FROM \"MentorProfile\"
  UNION ALL SELECT 'Post',           count(*) FROM \"Post\"
  UNION ALL SELECT 'JobPosting',     count(*) FROM \"JobPosting\"
  UNION ALL SELECT 'Trainee',        count(*) FROM \"Trainee\"
  UNION ALL SELECT 'Stipend',        count(*) FROM \"Stipend\"
  ORDER BY tbl;
"

echo ""
echo "[restore] done."
