#!/usr/bin/env bash
# shellcheck disable=SC2015  # ok/ko nunca fallan
# Prueba de deploy.sh / rollback.sh con git, docker y curl falsos: no toca Docker, AWS ni red.
# Uso: bash scripts/lightsail/test-deploy-rollback.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/app"
LOG="$T/calls.log"; export LOG T
echo "SECRETO_NO_IMPRIMIR=xyz" > "$T/app/.env"

cat > "$T/bin/git" <<'S'
#!/usr/bin/env bash
echo "git $*" >> "$LOG"
case "$1" in
  status) cat "$T/dirty" 2>/dev/null || true ;;
  rev-parse) if [ -f "$T/pulled" ]; then echo bbbbbbbbbbbb; else echo aaaaaaaaaaaa; fi ;;
  pull) touch "$T/pulled" ;;
esac
S
cat > "$T/bin/docker" <<'S'
#!/usr/bin/env bash
echo "docker $*" >> "$LOG"
if [ "$1 $2" = "image inspect" ]; then [ ! -f "$T/noimg" ]; fi
S
cat > "$T/bin/curl" <<'S'
#!/usr/bin/env bash
echo "curl $*" >> "$LOG"
[ ! -f "$T/unhealthy" ]
S
cat > "$T/bin/sleep" <<'S'
#!/usr/bin/env bash
:
S
chmod +x "$T/bin/"*
export PATH="$T/bin:$PATH" APP_DIR="$T/app" HEALTH_TRIES=2
fail=0; ok() { echo "ok - $1"; }; ko() { echo "FALLO - $1"; fail=1; }
reset() { rm -f "$LOG" "$T/pulled" "$T/dirty" "$T/noimg" "$T/unhealthy"; rm -rf "$T/app/.deploy"; }

# 1) deploy feliz: backup antes del pull, imagen etiquetada con el commit nuevo
reset; out="$(bash "$DIR/deploy.sh" 2>&1)" && ok "deploy exit 0" || ko "deploy exit 0"
grep -q "docker tag hot_click_outlet-app:latest hot_click_outlet-app:prev-aaaaaaaaaaaa" "$LOG" && ok "tag de backup" || ko "tag de backup"
[ "$(grep -n 'prev-aaaa' "$LOG" | cut -d: -f1)" -lt "$(grep -n 'git pull' "$LOG" | cut -d: -f1)" ] && ok "backup antes del pull" || ko "backup antes del pull"
grep -q "git pull --ff-only origin master" "$LOG" && ok "pull ff-only" || ko "pull ff-only"
grep -q "docker tag hot_click_outlet-app:latest hot_click_outlet-app:bbbbbbbbbbbb" "$LOG" && ok "imagen con commit" || ko "imagen con commit"
grep -q "compose -f docker-compose.lightsail.yml up -d --no-build app" "$LOG" && ok "up servicio app" || ko "up servicio app"
[ "$(cat "$T/app/.deploy/prev-commit")" = aaaaaaaaaaaa ] && ok "prev-commit guardado" || ko "prev-commit guardado"
echo "$out" | grep -q SECRETO && ko "no imprime .env" || ok "no imprime .env"
grep -Eq "push|login" "$LOG" && ko "no publica imágenes" || ok "no publica imágenes"

# 2) árbol sucio: no despliega
reset; echo " M x" > "$T/dirty"
if bash "$DIR/deploy.sh" >/dev/null 2>&1; then ko "sucio aborta"; else ok "sucio aborta"; fi
grep -q "git pull" "$LOG" && ko "sucio sin pull" || ok "sucio sin pull"

# 3) health falla: exit 1
reset; touch "$T/unhealthy"
if bash "$DIR/deploy.sh" >/dev/null 2>&1; then ko "health falla -> exit!=0"; else ok "health falla -> exit!=0"; fi

# 4) rollback usa la imagen previa guardada
reset; bash "$DIR/deploy.sh" >/dev/null 2>&1; : > "$LOG"
bash "$DIR/rollback.sh" >/dev/null 2>&1 && ok "rollback exit 0" || ko "rollback exit 0"
grep -q "docker tag hot_click_outlet-app:prev-aaaaaaaaaaaa hot_click_outlet-app:latest" "$LOG" && ok "rollback retag" || ko "rollback retag"
grep -q "up -d --no-build app" "$LOG" && ok "rollback sin build" || ko "rollback sin build"

# 5) rollback sin estado ni argumento: error
reset
if bash "$DIR/rollback.sh" >/dev/null 2>&1; then ko "rollback sin estado"; else ok "rollback sin estado"; fi

exit $fail
