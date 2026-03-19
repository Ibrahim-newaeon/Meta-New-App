#!/bin/bash
# scripts/setup.sh
# First-run setup for al-ai.ai Meta Ads Platform
# Run once on a fresh server: bash scripts/setup.sh

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

log()   { echo -e "${GREEN}✓${RESET} $1"; }
warn()  { echo -e "${AMBER}⚠${RESET}  $1"; }
error() { echo -e "${RED}✗${RESET}  $1"; exit 1; }
info()  { echo -e "${BOLD}→${RESET}  $1"; }

echo ""
echo -e "${BOLD}al-ai.ai Meta Ads Platform — First Run Setup${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Prerequisites ────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1  || error "Docker not found — install Docker Engine first"
command -v openssl >/dev/null 2>&1 || error "openssl not found"
command -v jq >/dev/null 2>&1      || warn "jq not found — some checks will be skipped"

# ─── Generate .env.prod from template ────────────────────────────────────────
ENV_FILE="docker/.env.prod"
if [ -f "$ENV_FILE" ]; then
  warn ".env.prod already exists — skipping generation. Delete and re-run to regenerate."
else
  info "Generating $ENV_FILE with secure secrets..."
  cat docker/.env.docker > "$ENV_FILE"

  # Auto-generate secrets
  NEXTAUTH_SECRET=$(openssl rand -base64 48)
  N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
  SYNC_SECRET=$(openssl rand -hex 24)
  POSTGRES_ROOT_PASSWORD=$(openssl rand -base64 24)
  POSTGRES_APP_PASSWORD=$(openssl rand -base64 24)
  POSTGRES_N8N_PASSWORD=$(openssl rand -base64 24)
  REDIS_PASSWORD=$(openssl rand -base64 24)

  sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" "$ENV_FILE"
  sed -i "s|N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY|" "$ENV_FILE"
  sed -i "s|SYNC_SECRET=.*|SYNC_SECRET=$SYNC_SECRET|" "$ENV_FILE"
  sed -i "s|POSTGRES_ROOT_PASSWORD=.*|POSTGRES_ROOT_PASSWORD=$POSTGRES_ROOT_PASSWORD|" "$ENV_FILE"
  sed -i "s|POSTGRES_APP_PASSWORD=.*|POSTGRES_APP_PASSWORD=$POSTGRES_APP_PASSWORD|" "$ENV_FILE"
  sed -i "s|POSTGRES_N8N_PASSWORD=.*|POSTGRES_N8N_PASSWORD=$POSTGRES_N8N_PASSWORD|" "$ENV_FILE"
  sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" "$ENV_FILE"

  log "Secrets generated and written to $ENV_FILE"
  warn "Fill in META_ACCESS_TOKEN, ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL etc. in $ENV_FILE before continuing"
  echo ""
  read -rp "Press Enter once you've filled in required credentials..."
fi

# ─── Validate required vars ───────────────────────────────────────────────────
info "Validating required environment variables..."
source "$ENV_FILE"

REQUIRED_VARS=(META_ACCESS_TOKEN META_AD_ACCOUNT_ID META_PAGE_ID ANTHROPIC_API_KEY NEXTAUTH_SECRET NEXTAUTH_URL N8N_PASSWORD)
MISSING=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR:-}" ]; then MISSING+=("$VAR"); fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  error "Missing required env vars: ${MISSING[*]}"
fi
log "All required env vars present"

# ─── SSL certificates ─────────────────────────────────────────────────────────
info "Checking SSL certificates..."
if [ ! -f "/etc/letsencrypt/live/app.al-ai.ai/fullchain.pem" ]; then
  warn "SSL certs not found. Run:"
  echo "  certbot certonly --standalone -d app.al-ai.ai -d n8n.al-ai.ai"
  echo ""
  read -rp "Skip SSL check and continue anyway? (y/N) " SKIP_SSL
  [ "$SKIP_SSL" != "y" ] && exit 1
else
  log "SSL certificates found"
fi

# ─── Start infrastructure ─────────────────────────────────────────────────────
info "Starting Postgres and Redis..."
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" \
  up -d postgres redis

echo "Waiting 10s for Postgres to be ready..."
sleep 10

# ─── Run migrations ───────────────────────────────────────────────────────────
info "Running Prisma migrations..."
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" \
  run --rm dashboard npx prisma migrate deploy

log "Migrations applied"

# ─── Seed admin user ──────────────────────────────────────────────────────────
info "Creating admin user..."
echo ""
read -rp "Admin email: " ADMIN_EMAIL
read -rsp "Admin password (min 8 chars): " ADMIN_PASSWORD
echo ""

docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" \
  run --rm --no-deps dashboard npx tsx -e "
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('$ADMIN_PASSWORD', 12);
const user = await prisma.user.upsert({
  where: { email: '$ADMIN_EMAIL' },
  update: { password: hash, role: 'ADMIN', active: true },
  create: { email: '$ADMIN_EMAIL', name: 'Admin', password: hash, role: 'ADMIN' },
});
console.log('Admin user:', user.id, user.email);
await prisma.\$disconnect();
"

log "Admin user created: $ADMIN_EMAIL"

# ─── Start all services ───────────────────────────────────────────────────────
info "Starting full stack..."
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" up -d

echo "Waiting 20s for services to start..."
sleep 20

# ─── Health check ────────────────────────────────────────────────────────────
info "Running health check..."
HEALTH=$(curl -sf "https://app.al-ai.ai/api/health" 2>/dev/null || echo '{"status":"fail"}')
STATUS=$(echo "$HEALTH" | jq -r '.status' 2>/dev/null || echo "fail")

if [ "$STATUS" = "ok" ]; then
  log "Health check passed"
else
  warn "Health check returned: $STATUS — check logs with: docker compose logs dashboard"
fi

# ─── Import n8n workflows ────────────────────────────────────────────────────
info "Importing n8n workflows..."
sleep 10  # Wait for n8n to fully start

N8N_PASSWORD_FROM_ENV=$(grep N8N_PASSWORD "$ENV_FILE" | cut -d= -f2)
N8N_PASSWORD_FROM_ENV="$N8N_PASSWORD_FROM_ENV" \
  node scripts/import-n8n-workflows.mjs || warn "n8n import failed — import manually at https://n8n.al-ai.ai"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo "  Dashboard:  https://app.al-ai.ai"
echo "  n8n:        https://n8n.al-ai.ai"
echo "  Login:      $ADMIN_EMAIL"
echo ""
echo -e "${AMBER}Next steps:${RESET}"
echo "  1. Open n8n and activate the 4 workflows"
echo "  2. Add credentials (Meta token, Claude key) in n8n Settings"
echo "  3. Run initial data sync:"
echo "     curl -X POST https://app.al-ai.ai/api/snapshots/sync \\"
echo "       -H 'x-sync-secret: \$SYNC_SECRET' \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"daysBack\": 30}'"
echo ""
