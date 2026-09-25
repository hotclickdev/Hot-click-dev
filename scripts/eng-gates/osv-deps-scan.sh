#!/usr/bin/env bash
# Escaneo de dependencias Maven (pom.xml) + pnpm (pnpm-lock.yaml) con osv-scanner.
# No compila ni instala paquetes: lee manifiestos/lockfiles y consulta osv.dev.
# El umbral HIGH/CRITICAL lo aplica osv-deps-gate.mjs (medium/low solo informan).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BIN="${OSV_SCANNER_BIN:-./osv-scanner}"
ALLOWLIST="${OSV_DEPS_ALLOWLIST:-scripts/eng-gates/osv-deps-allowlist.json}"
REPORT="${OSV_DEPS_REPORT:-osv-deps-report.json}"
POM="${OSV_DEPS_POM:-Hot_click_outlet/pom.xml}"
PNPM_LOCK="${OSV_DEPS_PNPM_LOCK:-Hot_click_outlet/frontend/pnpm-lock.yaml}"

if [[ ! -x "$BIN" ]]; then
  echo "osv-scanner no ejecutable: $BIN" >&2
  exit 127
fi
if [[ ! -f "$POM" ]]; then
  echo "falta pom: $POM" >&2
  exit 127
fi
if [[ ! -f "$PNPM_LOCK" ]]; then
  echo "falta pnpm-lock: $PNPM_LOCK" >&2
  exit 127
fi
if [[ ! -f "$ALLOWLIST" ]]; then
  echo "falta allowlist: $ALLOWLIST" >&2
  exit 127
fi

echo "osv-deps-scan: pom=$POM lock=$PNPM_LOCK allowlist=$ALLOWLIST"

set +e
"$BIN" scan \
  --format=json \
  --lockfile="$POM" \
  --lockfile="$PNPM_LOCK" \
  >"$REPORT" \
  2>osv-deps-scan.stderr
OSV_RC=$?
set -e

if [[ -s osv-deps-scan.stderr ]]; then
  echo "--- stderr osv-scanner ---"
  cat osv-deps-scan.stderr
  echo "--------------------------"
fi

# 0 = limpio, 1 = hay vulns. Cualquier otro código = fallo del escáner.
if [[ "$OSV_RC" -ne 0 && "$OSV_RC" -ne 1 ]]; then
  echo "osv-scanner falló con código $OSV_RC (esperado 0 o 1)" >&2
  exit "$OSV_RC"
fi

node scripts/eng-gates/osv-deps-gate.mjs "$REPORT" --osv-rc "$OSV_RC" --allowlist "$ALLOWLIST"
