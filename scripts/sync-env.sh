#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Pushes shared secrets from .env to the linked Vercel project (the web app)
# and the linked Railway service (the worker) in one shot, so updating a key
# locally doesn't mean re-pasting it into two dashboards by hand.
#
# One-time setup before this works (interactive - do this yourself once):
#   npx vercel login && npx vercel link      # pick the Lime Kraft project
#   npx railway login && npx railway link    # pick the Lime Kraft project,
#                                             # then the *worker* service
#
# Deliberately NOT synced - these must differ per environment, or stay off
# in production, so they're set by hand once in each dashboard instead:
#   APP_URL             - the production domain, not http://localhost:3000
#   REDIS_URL           - Railway's real Redis connection string, not the
#                         docker-compose-only redis://redis:6379
#   ALLOW_DEMO_FALLBACK - must stay unset/false anywhere the public can
#                         reach it - it bypasses admin/stakeholder auth
#   S3_*                - local MinIO addresses/credentials (S3_ACCESS_KEY is
#                         still literally "limekraft" in dev) - set real
#                         object-storage credentials by hand once you have them
#   PGSSL_DISABLE       - only for a plain-TLS local/CI Postgres
#   NODE_ENV            - set by the platform, never by hand

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found." >&2
  exit 1
fi

EXCLUDE=(APP_URL REDIS_URL ALLOW_DEMO_FALLBACK PGSSL_DISABLE NODE_ENV)

is_excluded() {
  local key="$1"
  [[ "$key" == S3_* ]] && return 0
  for x in "${EXCLUDE[@]}"; do
    [ "$key" = "$x" ] && return 0
  done
  return 1
}

KEYS=()
VALUES=()

while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  [[ "$line" != *"="* ]] && continue

  key="$(echo "${line%%=*}" | xargs)"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"

  [ -z "$value" ] && continue
  is_excluded "$key" && continue

  KEYS+=("$key")
  VALUES+=("$value")
done < "$ENV_FILE"

if [ ${#KEYS[@]} -eq 0 ]; then
  echo "Nothing to sync - $ENV_FILE has no non-empty, non-excluded variables."
  exit 0
fi

echo "Found ${#KEYS[@]} variables to sync (skipping ${#EXCLUDE[@]} environment-specific ones)."

echo ""
echo "→ Vercel (production)"
for i in "${!KEYS[@]}"; do
  key="${KEYS[$i]}"
  value="${VALUES[$i]}"
  if npx vercel env add "$key" production --value "$value" --yes --force >/dev/null 2>&1; then
    echo "  ✓ $key"
  else
    echo "  ✗ $key (see: npx vercel env add $key production)" >&2
  fi
done

echo ""
echo "→ Railway (linked service)"
RAILWAY_PAIRS=()
for i in "${!KEYS[@]}"; do
  RAILWAY_PAIRS+=("${KEYS[$i]}=${VALUES[$i]}")
done
npx railway variable set "${RAILWAY_PAIRS[@]}"

echo ""
echo "Done. Railway redeploys the worker automatically on variable changes."
echo "Vercel only bakes these into the *next* deploy - push a commit or run"
echo "'npx vercel --prod' to actually pick them up."
