#!/usr/bin/env bash
# Selftest local de ola 4 (sin secretos, sin tocar prod).
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test scripts/eng-gates/ola4.test.mjs
echo "ola4 selftest OK"
