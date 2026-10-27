#!/usr/bin/env bash
# PROPUESTA (decisión pendiente del dueño). Genera de forma reproducible el esquema
# base consolidado db/bootstrap/V1__esquema_base_consolidado.sql.
#
# Por qué no se rejuega V1..VN: V1 es un dump legacy (identificadores "MAYUS" entre
# comillas, y al final ALTERs sobre columnas que solo creaba Hibernate), así que la
# cadena no corre en una base vacía. La única fuente reproducible del esquema actual es
# la misma que usa el perfil dev: baseline en la última V + Hibernate ddl-auto=update
# + db/dev-bootstrap/nativas.sql.
#
# Requisitos: Postgres LOCAL (nunca prod), java 21, el jar ya compilado
#   (mvn -B -DskipTests package en Hot_click_outlet).
# Uso: HC_BOOT_PASS=<pass local> PGURL_ADMIN=postgres:///postgres scripts/flyway/generar-esquema-base.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
APP="$RAIZ/Hot_click_outlet"
JAR="$(ls "$APP"/target/hot-click-outlet-*.jar | head -1)"
DB="${HC_BOOT_DB:-hc_boot_gen}"
USR="${HC_BOOT_USER:-hc_boot}"
PASS="${HC_BOOT_PASS:?definí HC_BOOT_PASS (rol local con CREATEDB)}"
PSQL_ADMIN=(psql "${PGURL_ADMIN:-postgres:///postgres}" -v ON_ERROR_STOP=1 -q)
OUT="$APP/src/main/resources/db/bootstrap/V1__esquema_base_consolidado.sql"
ULTIMA="$(ls "$APP"/src/main/resources/db/migration/V*__*.sql | sed -E 's#.*/V([0-9]+)__.*#\1#' | sort -n | tail -1)"
TMP="$(mktemp -d)"
"${PSQL_ADMIN[@]}" -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB OWNER $USR"
SPRING_PROFILES_ACTIVE=dev SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/$DB" \
  SPRING_DATASOURCE_USERNAME="$USR" SPRING_DATASOURCE_PASSWORD="$PASS" SERVER_PORT=18099 \
  HOTCLICK_SEED_CATALOGO_LOCAL=false SPRING_JPA_SHOW_SQL=false SENTRY_DSN= \
  java -Xmx1g -jar "$JAR" >"$TMP/app.log" 2>&1 &
APP_PID=$!
trap 'kill "$APP_PID" 2>/dev/null || true; rm -rf "$TMP"' EXIT
for _ in $(seq 1 300); do
  grep -qE 'Started Hotclick' "$TMP/app.log" && break
  grep -qE 'APPLICATION FAILED|Application run failed' "$TMP/app.log" && { tail -40 "$TMP/app.log"; exit 1; }
  sleep 2
done
grep -q 'Started Hotclick' "$TMP/app.log" || { echo "timeout arrancando la app"; exit 1; }
DUMP_URL="${PGURL_ADMIN:-postgres:///postgres}"; DUMP_URL="${DUMP_URL%/*}/$DB"
{
  echo "-- GENERADO por scripts/flyway/generar-esquema-base.sh. NO editar a mano."
  echo "-- Esquema equivalente a db/migration hasta V$ULTIMA (perfil dev: baseline + Hibernate + nativas)."
  echo "-- hotclick.bootstrap.version=$ULTIMA"
  pg_dump "$DUMP_URL" --schema-only --no-owner --no-privileges --no-comments \
      --exclude-table=flyway_schema_history \
    | grep -vE '^\\(restrict|unrestrict) ' \
    | grep -vE '^SET (transaction_timeout|default_table_access_method)' \
    | grep -v "pg_catalog.set_config('search_path'" \
    | sed -E 's/\bpublic\.//g' \
    | cat -s
} >"$OUT"
echo "OK: $OUT (V$ULTIMA, $(grep -c 'CREATE TABLE' "$OUT") tablas)"
