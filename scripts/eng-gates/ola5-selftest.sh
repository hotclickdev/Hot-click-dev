#!/usr/bin/env bash
# Selftest local de ola 5 (sin secretos, sin tocar prod).
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test scripts/eng-gates/ola5.test.mjs
echo "ola5 selftest OK"
