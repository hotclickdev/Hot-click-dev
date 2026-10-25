#!/usr/bin/env bash
# INF-02: vuelve a la imagen previa guardada por deploy.sh (o a la etiqueta indicada).
# Uso: scripts/lightsail/rollback.sh [etiqueta]   p.ej. prev-abc123 o abc123
# Solo cambia la imagen que corre; no toca la base de datos ni el .env.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.lightsail.yml}"
SERVICE="${SERVICE:-app}"
IMAGE="${IMAGE:-hot_click_outlet-app}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/api/health}"
HEALTH_TRIES="${HEALTH_TRIES:-30}"
HEALTH_SLEEP="${HEALTH_SLEEP:-5}"
STATE_DIR="${STATE_DIR:-$APP_DIR/.deploy}"

cd "$APP_DIR"
if [ "$#" -ge 1 ]; then
  target="$IMAGE:$1"
else
  target="$(cat "$STATE_DIR/prev-image" 2>/dev/null || true)"
fi
if [ -z "$target" ]; then
  echo "ERROR: no hay imagen previa registrada; pasá la etiqueta como argumento." >&2
  exit 2
fi
if ! docker image inspect "$target" >/dev/null 2>&1; then
  echo "ERROR: no existe la imagen $target." >&2
  exit 2
fi

echo "Rollback a $target"
docker tag "$target" "$IMAGE:latest"
docker compose -f "$COMPOSE_FILE" up -d --no-build "$SERVICE"

for _ in $(seq 1 "$HEALTH_TRIES"); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "OK: rollback a $target sano"
    exit 0
  fi
  sleep "$HEALTH_SLEEP"
done
echo "ERROR: tras el rollback /api/health sigue sin responder." >&2
exit 1
