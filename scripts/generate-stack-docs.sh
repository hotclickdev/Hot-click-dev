#!/usr/bin/env bash
# DOC1 — regenera docs/GENERATED_STACK.md y (opcional) parchea claims seguros.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APPLY=""
if [[ "${1:-}" == "--apply-safe-docs" ]]; then
  APPLY="--apply-safe-docs"
fi
exec node scripts/eng-gates/generate-stack-docs.mjs --write ${APPLY}
