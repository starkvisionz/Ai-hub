#!/usr/bin/env bash
#
# agent-report.sh — report agent activity to the hub's command center.
#
# The uniform integration point for every agent (Claude Code, Codex, Hermes,
# cron jobs, n8n…): a heartbeat marks the agent online with its current task;
# run-start/run-done/run-fail log work to the activity stream.
#
# Env:
#   HUB_URL         Base URL of the hub app (default http://localhost:3000;
#                   on the tailnet e.g. http://100.x.y.z:3000).
#   HUB_API_TOKEN   Bearer token, required when the hub's API is gated.
#
# Usage:
#   agent-report.sh heartbeat <name> [type] [task] [project]
#   agent-report.sh run-start <name> <task> [project]       -> prints run id
#   agent-report.sh run-done  <run-id> [detail]
#   agent-report.sh run-fail  <run-id> [detail]
#
# Examples (see app/README.md §Agent command center for per-agent wiring):
#   agent-report.sh heartbeat claude-code claude-code "refactoring auth" ai-hub
#   id=$(agent-report.sh run-start codex "generate tests" ai-hub)
#   agent-report.sh run-done "$id" "12 tests added"

set -euo pipefail

HUB_URL="${HUB_URL:-http://localhost:3000}"
auth=()
[ -n "${HUB_API_TOKEN:-}" ] && auth=(-H "Authorization: Bearer ${HUB_API_TOKEN}")

json_escape() { python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1" 2>/dev/null || printf '"%s"' "$1"; }

post() { # post <path> <json>
  curl -sS -f -X POST "${HUB_URL%/}$1" "${auth[@]}" \
    -H 'content-type: application/json' -d "$2"
}

cmd="${1:-}"
case "$cmd" in
  heartbeat)
    name="${2:?usage: agent-report.sh heartbeat <name> [type] [task] [project]}"
    body="{\"name\":$(json_escape "$name")"
    [ -n "${3:-}" ] && body+=",\"type\":$(json_escape "$3")"
    [ "${4+x}" = "x" ] && body+=",\"current_task\":$(json_escape "${4}")"
    [ -n "${5:-}" ] && body+=",\"project\":$(json_escape "$5")"
    body+="}"
    post /api/agents "$body" >/dev/null && echo "heartbeat ok: $name"
    ;;
  run-start)
    name="${2:?usage: agent-report.sh run-start <name> <task> [project]}"
    task="${3:?task required}"
    body="{\"agent\":$(json_escape "$name"),\"task\":$(json_escape "$task"),\"status\":\"running\""
    [ -n "${4:-}" ] && body+=",\"project\":$(json_escape "$4")"
    body+="}"
    post /api/runs "$body" | python3 -c 'import json,sys; print(json.load(sys.stdin)["run"]["id"])'
    ;;
  run-done|run-fail)
    id="${2:?usage: agent-report.sh ${cmd} <run-id> [detail]}"
    status="done"; [ "$cmd" = "run-fail" ] && status="failed"
    body="{\"status\":\"$status\""
    [ -n "${3:-}" ] && body+=",\"detail\":$(json_escape "$3")"
    body+="}"
    curl -sS -f -X PATCH "${HUB_URL%/}/api/runs?id=${id}" "${auth[@]}" \
      -H 'content-type: application/json' -d "$body" >/dev/null && echo "run ${id}: ${status}"
    ;;
  *)
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
