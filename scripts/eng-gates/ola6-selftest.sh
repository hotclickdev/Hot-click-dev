#!/usr/bin/env bash
# Selftest local de ola 6 (sin secretos, sin pegar prod).
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test scripts/eng-gates/ola6.test.mjs
echo "ola6 selftest OK"
