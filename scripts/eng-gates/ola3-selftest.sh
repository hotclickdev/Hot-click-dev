#!/usr/bin/env bash
# Selftest local de ola 3 (sin secretos, sin tocar prod).
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test scripts/eng-gates/ola3.test.mjs
echo "ola3 selftest OK"
