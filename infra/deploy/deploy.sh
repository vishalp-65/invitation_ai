#!/usr/bin/env bash
# Deploys one image tag of the Noyta api + worker in /opt/noyta. CI runs it after every build; run it
# by hand to roll back:   cd /opt/noyta && ./deploy.sh ghcr.io/<owner>/noyta <old-sha>
#
#   pull -> migrate (new image, before the swap) -> recreate -> health gate -> rollback on failure
#   -> drop Noyta images other than the current and previous tag (interviewpilot's are never touched)
set -euo pipefail

PREFIX="${1:?usage: deploy.sh <image-prefix> <tag>}"
TAG="${2:?usage: deploy.sh <image-prefix> <tag>}"
cd "$(dirname "$0")"

test -f .env || { echo "Missing $(pwd)/.env"; exit 1; }
PORT="$(grep -E '^API_HOST_PORT=' .env | cut -d= -f2 || true)"
HEALTH_URL="http://127.0.0.1:${PORT:-4100}/api/health/ready"
dc() { docker compose -f docker-compose.prod.yml --env-file .env --env-file .deploy.env "$@"; }

# Remember what is running so a failed health check can go back to it
[ -f .deploy.env ] && cp .deploy.env .deploy.prev.env
printf 'REGISTRY_IMAGE_API=%s\nREGISTRY_IMAGE_WORKER=%s\n' "$PREFIX-api:$TAG" "$PREFIX-worker:$TAG" > .deploy.env

# Forward-only migrations run with the new image (DATABASE_URL_DIRECT if set) before anything is swapped
if ! dc pull --quiet api worker || ! dc run --rm --no-deps api node packages/db/dist/migrate.js; then
  echo "Pull or migration failed; the running containers were not touched"
  [ -f .deploy.prev.env ] && cp .deploy.prev.env .deploy.env
  exit 1
fi
dc up -d --remove-orphans api worker

for _ in $(seq 1 40); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "Healthy: $TAG"
    # Keep only the current + previous tags of our own images
    keep="$(cat .deploy.env .deploy.prev.env 2>/dev/null | cut -d= -f2 | sort -u)"
    docker images --format '{{.Repository}}:{{.Tag}}' "$PREFIX-*" | grep -vxF "$keep" | xargs -r docker rmi >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 3
done

echo "Health check failed for $TAG"
dc logs --tail=100 api
if [ -f .deploy.prev.env ]; then
  echo "Rolling back to the previous images"
  cp .deploy.prev.env .deploy.env
  dc up -d api worker
fi
exit 1
