#!/usr/bin/env bash
# Suite E2E «simulación final» en SANDBOX AISLADO: Postgres propio + backend (perfil dev) + Vite + Playwright full-stack.
# Nunca toca producción ni una instancia ajena: usa puertos propios, BD propia (datadir temporal) y baja SOLO sus PID.
#
# Uso:   scripts/e2e-sandbox.sh [filtro-playwright]      ej.: scripts/e2e-sandbox.sh "fullstack/(08|09|10|11)-"
# Variables (todas opcionales):
#   E2E_PG_PORT=55434  E2E_BACKEND_PORT=18081  E2E_FRONT_PORT=3100   puertos (PROHIBIDOS: 5432 8081 3000 55432 y los ocupados)
#   E2E_PG_BIN=<dir con initdb, pg_ctl, psql>   (por defecto: pg_config --bindir, o el PATH)
#   E2E_WORKDIR=/tmp/e2e-sandbox                 datadir de Postgres, logs y clave QA efímera
#   E2E_JAR=Hot_click_outlet/target/hot-click-outlet-1.0.0.jar   (si falta se compila con mvn -DskipTests)
#   ONVO_SECRET_KEY    SOLO se pasa al backend si empieza por onvo_test_. Una onvo_live_ ABORTA; cualquier otra se descarta.
#   ONVO_PRICE_ID_PYME + ONVO_PRICE_ID_NEGOCIO_PLUS   precios de PRUEBA de ONVO: habilitan el cobro real de sandbox (modo C)
#   ONVO_PUBLISHABLE_KEY                         llave pública de prueba para el SDK web (modo C)
# Sin llave ONVO el backend usa el mock dev/test (modo A: no hay cobros). Nunca se imprime ningún secreto.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGPORT="${E2E_PG_PORT:-55434}"; BEPORT="${E2E_BACKEND_PORT:-18081}"; FEPORT="${E2E_FRONT_PORT:-3100}"
WORK="${E2E_WORKDIR:-/tmp/e2e-sandbox}"
JAR="${E2E_JAR:-$RAIZ/Hot_click_outlet/target/hot-click-outlet-1.0.0.jar}"
FILTRO="${1:-}"

# ── Guardas ──────────────────────────────────────────────────────────────────
for v in "${ONVO_SECRET_KEY:-}" "${ONVO_PUBLISHABLE_KEY:-}" "${ONVO_PRICE_ID_PYME:-}" "${ONVO_PRICE_ID_NEGOCIO_PLUS:-}"; do
  case "$v" in onvo_live_*|pk_live_*|sk_live_*) echo "ABORTADO: hay una llave live en el entorno. Solo onvo_test_/sandbox." >&2; exit 2;; esac
done
for p in "$PGPORT" "$BEPORT" "$FEPORT"; do
  case "$p" in 5432|8081|3000|55432) echo "ABORTADO: el puerto $p está prohibido (QA viva / instancia ajena)." >&2; exit 2;; esac
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then echo "ABORTADO: el puerto $p ya está ocupado." >&2; exit 2; fi
done
[ "$PGPORT" != "$BEPORT" ] && [ "$BEPORT" != "$FEPORT" ] && [ "$PGPORT" != "$FEPORT" ] || { echo "ABORTADO: puertos repetidos." >&2; exit 2; }

PGBIN="${E2E_PG_BIN:-$(pg_config --bindir 2>/dev/null || true)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb 2>/dev/null || echo /nonexistent/x)")"
[ -x "$PGBIN/initdb" ] && [ -x "$PGBIN/pg_ctl" ] || { echo "Falta initdb/pg_ctl: defina E2E_PG_BIN" >&2; exit 2; }
PSQL="${PGBIN}/psql"; [ -x "$PSQL" ] || PSQL=psql

mkdir -p "$WORK"; chmod 700 "$WORK"
PIDS_BACKEND=""; PG_STARTED=0
bajar() {
  # Solo los PID propios: backend (guardado al arrancar) y el postgres de NUESTRO datadir.
  [ -n "$PIDS_BACKEND" ] && kill "$PIDS_BACKEND" 2>/dev/null || true
  [ "$PG_STARTED" = 1 ] && "$PGBIN/pg_ctl" -D "$WORK/pgdata" -m fast stop >/dev/null 2>&1 || true
}
trap bajar EXIT

# ── Postgres propio ──────────────────────────────────────────────────────────
rm -rf "$WORK/pgdata"
"$PGBIN/initdb" -D "$WORK/pgdata" -U postgres --auth=trust -E UTF8 >"$WORK/initdb.log" 2>&1
"$PGBIN/pg_ctl" -D "$WORK/pgdata" -w -l "$WORK/pg.log" \
  -o "-p $PGPORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$WORK" start >/dev/null
PG_STARTED=1
"$PSQL" -h 127.0.0.1 -p "$PGPORT" -U postgres -qc "CREATE DATABASE hotclick_e2e"

# ── Backend (perfil dev: Flyway + seed catálogo + QaCuentasSeeder) ───────────
[ -f "$JAR" ] || (cd "$RAIZ/Hot_click_outlet" && mvn -B -q -DskipTests package)
umask 077; QA_PASS="E2e-$(openssl rand -hex 16)!"
MODO_ONVO=""; BE_ENV=()
case "${ONVO_SECRET_KEY:-}" in
  onvo_test_*) BE_ENV+=("ONVO_SECRET_KEY=$ONVO_SECRET_KEY"); MODO_ONVO=prueba
    [ -n "${ONVO_PUBLISHABLE_KEY:-}" ] && BE_ENV+=("ONVO_PUBLISHABLE_KEY=$ONVO_PUBLISHABLE_KEY")
    [ -n "${ONVO_WEBHOOK_SECRET:-}" ] && BE_ENV+=("ONVO_WEBHOOK_SECRET=$ONVO_WEBHOOK_SECRET");;
  "") ;;
  *) echo "AVISO: ONVO_SECRET_KEY no es onvo_test_: se descarta (backend en mock/fail-closed)." >&2;;
esac
PRECIOS=""
if [ -n "$MODO_ONVO" ] && [ -n "${ONVO_PRICE_ID_PYME:-}" ] && [ -n "${ONVO_PRICE_ID_NEGOCIO_PLUS:-}" ]; then
  BE_ENV+=("ONVO_PRICE_ID_PYME=$ONVO_PRICE_ID_PYME" "ONVO_PRICE_ID_NEGOCIO_PLUS=$ONVO_PRICE_ID_NEGOCIO_PLUS"); PRECIOS=listo
  [ -n "${ONVO_PRICE_ID_EMPRENDEDOR:-}" ] && BE_ENV+=("ONVO_PRICE_ID_EMPRENDEDOR=$ONVO_PRICE_ID_EMPRENDEDOR")
fi
env -i PATH="$PATH" HOME="$HOME" ${JAVA_HOME:+JAVA_HOME="$JAVA_HOME"} \
  SPRING_PROFILES_ACTIVE=dev SERVER_PORT="$BEPORT" \
  SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:$PGPORT/hotclick_e2e" SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=x \
  CORS_ALLOWED_ORIGINS="http://127.0.0.1:$FEPORT,http://localhost:$FEPORT" QA_DEFAULT_PASSWORD="$QA_PASS" "${BE_ENV[@]}" \
  nohup java -Xmx1g -jar "$JAR" >"$WORK/backend.log" 2>&1 &
PIDS_BACKEND=$!
for _ in $(seq 1 120); do curl -fsS "http://127.0.0.1:$BEPORT/api/public/auth-config" >/dev/null 2>&1 && break; sleep 2; done
curl -fsS "http://127.0.0.1:$BEPORT/api/public/auth-config" >/dev/null || { echo "el backend no arrancó; ver $WORK/backend.log" >&2; exit 1; }
echo "sandbox: pg=$PGPORT backend=$BEPORT front=$FEPORT onvo=${MODO_ONVO:-mock/sin-llave} precios=${PRECIOS:-no}"

# ── Playwright full-stack (Vite lo levanta playwright.fullstack.config.ts en el puerto del front) ──
cd "$RAIZ/Hot_click_outlet/frontend"
[ -d node_modules ] || pnpm install --frozen-lockfile
export E2E_QA_PASSWORD="$QA_PASS" VITE_API_PROXY="http://127.0.0.1:$BEPORT" PLAYWRIGHT_BASE_URL="http://127.0.0.1:$FEPORT"
export E2E_DATABASE_URL="postgresql://postgres@127.0.0.1:$PGPORT/hotclick_e2e" E2E_ONVO_MODO="$MODO_ONVO" E2E_ONVO_PRECIOS="$PRECIOS"
unset ONVO_SECRET_KEY ONVO_PUBLISHABLE_KEY ONVO_WEBHOOK_SECRET ONVO_PRICE_ID_PYME ONVO_PRICE_ID_NEGOCIO_PLUS ONVO_PRICE_ID_EMPRENDEDOR
unset CI   # reuseExistingServer solo local; en CI Vite lo gestiona el config
if [ -n "$FILTRO" ]; then pnpm exec playwright test -c playwright.fullstack.config.ts "$FILTRO"
else pnpm test:e2e:fullstack; fi
