#!/usr/bin/env bash
# INF-02: deploy en Lightsail con punto de retorno.
# Uso (en el servidor, desde cualquier carpeta):  scripts/lightsail/deploy.sh
# 1) guarda el commit actual y etiqueta la imagen actual como prev-<commit>
# 2) git pull --ff-only, build de la imagen, la etiqueta con el commit nuevo
# 3) levanta el servicio y verifica /api/health; si falla, indica rollback.sh
# Nunca imprime .env. No publica imágenes en ningún registro.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.lightsail.yml}"
SERVICE="${SERVICE:-app}"
IMAGE="${IMAGE:-hot_click_outlet-app}"
BRANCH="${BRANCH:-master}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/api/health}"
HEALTH_TRIES="${HEALTH_TRIES:-30}"
HEALTH_SLEEP="${HEALTH_SLEEP:-5}"
STATE_DIR="${STATE_DIR:-$APP_DIR/.deploy}"

cd "$APP_DIR"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ERROR: hay cambios locales sin commit; no se despliega." >&2
  exit 2
fi

mkdir -p "$STATE_DIR"
prev="$(git rev-parse --short=12 HEAD)"
echo "$prev" > "$STATE_DIR/prev-commit"
if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
  docker tag "$IMAGE:latest" "$IMAGE:prev-$prev"
  echo "$IMAGE:prev-$prev" > "$STATE_DIR/prev-image"
  echo "Backup: commit $prev, imagen $IMAGE:prev-$prev"
else
  echo "Aviso: no existe $IMAGE:latest; no hay imagen previa para respaldar." >&2
  : > "$STATE_DIR/prev-image"
fi

git pull --ff-only origin "$BRANCH"
new="$(git rev-parse --short=12 HEAD)"
echo "Desplegando $prev -> $new"

docker compose -f "$COMPOSE_FILE" build "$SERVICE"
docker tag "$IMAGE:latest" "$IMAGE:$new"
docker compose -f "$COMPOSE_FILE" up -d --no-build "$SERVICE"
echo "$new" > "$STATE_DIR/current-commit"

for _ in $(seq 1 "$HEALTH_TRIES"); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then
    echo "OK: $IMAGE:$new sano en $HEALTH_URL"
    exit 0
  fi
  sleep "$HEALTH_SLEEP"
done
echo "ERROR: /api/health no respondió. Volver atrás con: scripts/lightsail/rollback.sh" >&2
exit 1
