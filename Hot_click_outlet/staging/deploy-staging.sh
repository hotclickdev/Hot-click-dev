#!/usr/bin/env bash
# Deploy de master al servidor de STAGING (nunca a producción).
# 1) valida .env.staging: HOTCLICK_ENV=staging, perfil != dev/test, ONVO solo onvo_test_ (aborta ante live)
# 2) git pull --ff-only origin master
# 3) build y up del proyecto docker "hotclick-staging"; espera /api/health
# No imprime el .env. No toca AWS ni producción.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$DIR/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$DIR/.env.staging}"
BRANCH="${BRANCH:-master}"
PROJECT="hotclick-staging"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health}"
HEALTH_TRIES="${HEALTH_TRIES:-36}"
HEALTH_SLEEP="${HEALTH_SLEEP:-5}"
# shellcheck source-path=SCRIPTDIR source=lib-staging.sh
. "$DIR/lib-staging.sh"

validar_env_staging "$ENV_FILE"
[ "$BRANCH" = "master" ] || { echo "staging: solo se despliega master" >&2; exit 14; }

cd "$APP_DIR"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "staging: hay cambios locales sin commit; no se despliega." >&2; exit 2
fi
git pull --ff-only origin "$BRANCH"
echo "staging: desplegando $(git rev-parse --short=12 HEAD)"

COMPOSE=(docker compose -p "$PROJECT" -f "$DIR/docker-compose.staging.yml" --env-file "$ENV_FILE")
"${COMPOSE[@]}" build app
"${COMPOSE[@]}" up -d
for _ in $(seq 1 "$HEALTH_TRIES"); do
  if curl -fsS -o /dev/null "$HEALTH_URL"; then echo "staging: OK en $HEALTH_URL"; exit 0; fi
  sleep "$HEALTH_SLEEP"
done
echo "staging: ERROR: /api/health no respondió" >&2
exit 1
