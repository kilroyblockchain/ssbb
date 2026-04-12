#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SSBB Deploy Script
# Usage:
#   ./scripts/deploy.sh             # deploy everything (frontend + server)
#   ./scripts/deploy.sh --frontend  # frontend only (fast — no Docker build)
#   ./scripts/deploy.sh --server    # server only
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION=us-east-1
ECR_IMAGE=672930000617.dkr.ecr.us-east-1.amazonaws.com/ssbb-server:latest
S3_BUCKET=ssbb-web-prod
ECS_CLUSTER=ssbb-prod
ECS_SERVICE=ssbb-server-prod
CF_DOMAIN=ssbb.pretendo.tv

# Parse flags
DO_FRONTEND=true
DO_SERVER=true
if [[ "${1:-}" == "--frontend" ]]; then DO_SERVER=false; fi
if [[ "${1:-}" == "--server"   ]]; then DO_FRONTEND=false; fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo ""; echo "▶ $*"; }
pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
log "Pre-flight checks"
command -v aws    >/dev/null || fail "aws CLI not found"
command -v docker >/dev/null || fail "docker not found"
command -v npm    >/dev/null || fail "npm not found"
aws sts get-caller-identity --query Account --output text >/dev/null || fail "AWS credentials not configured"
pass "AWS credentials OK"

# ── Frontend ──────────────────────────────────────────────────────────────────
if $DO_FRONTEND; then
  log "Building frontend"
  npm run build:web
  pass "Vite build done"

  log "Syncing to S3"
  aws s3 sync apps/web/dist "s3://$S3_BUCKET" --delete --region "$REGION"
  pass "S3 sync done"

  log "Invalidating CloudFront cache"
  DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?contains(Aliases.Items, \`$CF_DOMAIN\`)].Id" \
    --output text)
  if [[ -z "$DIST_ID" ]]; then
    fail "Could not find CloudFront distribution for $CF_DOMAIN"
  fi
  aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" --paths "/*" \
    --query 'Invalidation.Status' --output text
  pass "CloudFront invalidation started (takes ~30 seconds to propagate)"
fi

# ── Server ────────────────────────────────────────────────────────────────────
if $DO_SERVER; then
  log "Logging in to ECR"
  aws ecr get-login-password --region "$REGION" \
    | docker login --username AWS --password-stdin \
      "$(echo "$ECR_IMAGE" | cut -d/ -f1)"
  pass "ECR login OK"

  log "Building server image for linux/amd64"
  docker buildx build \
    --platform linux/amd64 \
    --push \
    -f apps/server/Dockerfile \
    -t "$ECR_IMAGE" \
    .
  pass "Image pushed: $ECR_IMAGE"

  log "Forcing ECS redeployment"
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --force-new-deployment \
    --region "$REGION" \
    --query 'service.deployments[0].status' --output text
  pass "ECS deployment triggered"

  log "Waiting for service to stabilise (can take ~2 min)"
  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$REGION"
  pass "ECS service stable"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────"
echo "  Deploy complete. https://$CF_DOMAIN"
echo "────────────────────────────────────────────"
