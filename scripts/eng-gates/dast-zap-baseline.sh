#!/usr/bin/env bash
# DAST al merge: la app ya está en :8080 con perfil dev.
# Avisos de ZAP no fallan (-I). Un fallo (exit >= 2) sí.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/zap-out"
mkdir -p "$OUT"
chmod 777 "$OUT"

curl -fsS "http://127.0.0.1:8080/api/health" >/dev/null

set +e
docker run --rm --network host \
  -v "$OUT:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "http://127.0.0.1:8080" -I -m 5 -J zap-report.json -r zap-report.html
code=$?
set -e

if [[ "$code" -ge 2 ]]; then
  echo "ZAP FAIL — código $code. Reporte en zap-out/zap-report.html"
  exit "$code"
fi

echo "ZAP baseline terminó (código $code). Los avisos no bloquean; los fallos sí."
