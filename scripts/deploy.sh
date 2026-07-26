#!/usr/bin/env bash
#
# deploy.sh — trigger a Coolify redeploy via its API.
#
# Portable: used by .github/workflows/deploy.yml AND runnable by hand from
# anywhere that can reach the Coolify control plane (e.g. over Tailscale). No
# secrets are baked in — everything comes from the environment.
#
# Required env:
#   COOLIFY_URL              Base URL of the Coolify instance, no trailing slash
#                            (e.g. http://100.x.y.z:8000 over Tailscale).
#   COOLIFY_TOKEN            Coolify API token (Keys & Tokens → API tokens).
#   COOLIFY_RESOURCE_UUIDS   One or more resource UUIDs, comma-separated. One
#                            uuid if the whole stack is a single Compose resource;
#                            several if services are separate resources.
# Optional env:
#   COOLIFY_FORCE            "true" to force a rebuild (default: false).
#
# Exits non-zero if any deploy request is rejected.

set -euo pipefail

: "${COOLIFY_URL:?set COOLIFY_URL}"
: "${COOLIFY_TOKEN:?set COOLIFY_TOKEN}"
: "${COOLIFY_RESOURCE_UUIDS:?set COOLIFY_RESOURCE_UUIDS (comma-separated)}"

force="${COOLIFY_FORCE:-false}"
base="${COOLIFY_URL%/}"

IFS=',' read -ra uuids <<<"$COOLIFY_RESOURCE_UUIDS"
deployed=0
for raw in "${uuids[@]}"; do
  uuid="$(echo "$raw" | tr -d '[:space:]')"
  [ -z "$uuid" ] && continue
  echo "==> Triggering deploy for resource ${uuid}"
  resp="$(mktemp)"
  code="$(curl -sS -o "$resp" -w '%{http_code}' \
    -H "Authorization: Bearer ${COOLIFY_TOKEN}" \
    "${base}/api/v1/deploy?uuid=${uuid}&force=${force}")" || {
    echo "curl failed reaching ${base}" >&2
    rm -f "$resp"
    exit 1
  }
  echo "    HTTP ${code}: $(cat "$resp")"
  rm -f "$resp"
  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    echo "Deploy request for ${uuid} was rejected (HTTP ${code})." >&2
    exit 1
  fi
  deployed=$((deployed + 1))
done

if [ "$deployed" -eq 0 ]; then
  echo "No resource UUIDs supplied — nothing to deploy." >&2
  exit 1
fi
echo "==> Requested ${deployed} deploy(s). Coolify will build & roll out."
