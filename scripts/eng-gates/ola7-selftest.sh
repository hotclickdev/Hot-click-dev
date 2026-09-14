#!/usr/bin/env bash
# Selftest local de ola 7 (sin secretos, sin tocar prod, sin git push).
set -euo pipefail
cd "$(dirname "$0")/../.."

node --test scripts/eng-gates/ola7.test.mjs

workflows=(
  .github/workflows/real-health.yml
  .github/workflows/a11y-pos-keyboard.yml
  .github/workflows/runtime-endpoint-issue.yml
  .github/workflows/ola7-selftest.yml
)

for f in "${workflows[@]}"; do
  test -f "$f"
  if grep -nE '(^|[[:space:]])git push[[:space:]]+(origin|--|-u)' "$f"; then
    echo "FAIL: $f no debe hacer git push para despertar Render" >&2
    exit 1
  fi
done

if grep -nE '(^|[[:space:]])git push[[:space:]]+(origin|--|-u)' \
  scripts/eng-gates/real-health.mjs \
  scripts/eng-gates/a11y-pos-keyboard.mjs \
  scripts/eng-gates/runtime-endpoint-issue.mjs; then
  echo "FAIL: scripts ola 7 no deben hacer git push" >&2
  exit 1
fi

echo "ola7 selftest OK"
