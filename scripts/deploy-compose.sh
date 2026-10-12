#!/usr/bin/env bash
#
# deploy-compose.sh — on-box update for the Compose-only (no Coolify) deployment.
#
# Run FROM THE VPS, in the repo root's scripts/ dir or anywhere:
#   bash /opt/ai-hub/scripts/deploy-compose.sh
#
# Pulls the latest main, rolls the stack, and gates on the hub app's health.
# Safe to run repeatedly (manual, cron, or triggered by an n8n workflow).
# Reads secrets from the git-ignored .env next to docker-compose.yml.
#
# NOTE: the box is a deploy target, not a workspace — local edits to tracked
# files are discarded by the hard reset. .env and workspace/ contents are
# git-ignored and survive.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "==> Updating $REPO_DIR to origin/main"
git fetch origin main
git reset --hard origin/main

echo "==> Rolling the stack (build changed images, keep data volumes)"
docker compose pull --ignore-buildable 2>/dev/null || docker compose pull || true
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "==> Waiting for hub-app to report healthy"
for i in $(seq 1 45); do
  status="$(docker inspect -f '{{.State.Health.Status}}' ai-hub-app 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    echo "==> Deploy OK — hub-app healthy ✓"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "!! hub-app did not become healthy — current state:" >&2
docker compose ps
docker compose logs --tail 40 hub-app >&2 || true
exit 1
