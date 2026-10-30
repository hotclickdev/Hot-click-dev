#!/usr/bin/env bash
# ============================================================
# HOTCLICK — Restaurar un respaldo cifrado (INF-01)
# ============================================================
# Uso: restaurar-respaldo.sh --archivo <hotclick-*.dump.gz.gpg> --destino <base|URL|DSN>
#        [--ejecutar] [--permitir-prod]
# Por defecto es SIMULACRO (dry run): verifica sha256, descifra y corre
# pg_restore --list, pero no toca ninguna base.
#
# Allowlist de destino (todo lo demás se rechaza):
#   - host: localhost, 127.0.0.1, ::1 o socket unix local (sin host o ruta /...)
#   - base: el nombre debe contener restore, drill o test
#   Acepta nombre simple, postgresql://… / postgres://… y DSN key=value.
#   Con nombre simple o sin host se mira también PGHOST/PGHOSTADDR.
# --permitir-prod: ÚNICA excepción explícita. PELIGROSO: saltea la allowlist y
#   pg_restore --clean BORRA y reemplaza los objetos del destino. Solo para un
#   desastre real con OK explícito de Andrés.
# Contraseña: usá PGPASSFILE (~/.pgpass, chmod 600), nunca dentro de la URL.
# El dump descifrado NUNCA se escribe a disco: se descifra en streaming dos
# veces (una para --list, otra para restaurar). En disco solo queda el TOC
# (metadatos, sin filas) en un tmp 700 que borra el trap; si el proceso muere
# con SIGKILL ese tmp puede quedar: borrá /tmp/tmp.* tuyos tras un kill -9.
# Requiere la llave PRIVADA en el llavero de gpg (GNUPGHOME) de esa máquina.
# Variables: PG_RESTORE_CMD (def. pg_restore).
set -euo pipefail
umask 077
die() { echo "restaurar: ERROR: $*" >&2; exit 1; }
log() { echo "restaurar: $*"; }

ARCHIVO=""; DESTINO=""; EJECUTAR=0; PROD_OK=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --archivo) ARCHIVO="${2:-}"; shift 2;;
    --destino) DESTINO="${2:-}"; shift 2;;
    --ejecutar) EJECUTAR=1; shift;;
    --permitir-prod) PROD_OK=1; shift;;
    *) die "argumento desconocido: $1";;
  esac
done
[[ -n "$ARCHIVO" && -n "$DESTINO" ]] || die "uso: --archivo <f> --destino <base> [--ejecutar] [--permitir-prod]"
[[ -r "$ARCHIVO" ]] || die "no se puede leer el archivo"

# Devuelve 0 si DESTINO cumple la allowlist. Setea D_HOST y D_DB.
D_HOST=""; D_DB=""
destino_permitido() {
  local d="$1" resto hp q kv k v
  if [[ "$d" =~ ^postgres(ql)?:// ]]; then
    resto="${d#*://}"
    q=""; [[ "$resto" == *\?* ]] && { q="${resto#*\?}"; resto="${resto%%\?*}"; }
    hp="${resto%%/*}"; D_DB=""; [[ "$resto" == */* ]] && D_DB="${resto#*/}"
    hp="${hp##*@}"
    if [[ "$hp" =~ ^\[([^]]*)\](:[0-9]+)?$ ]]; then D_HOST="${BASH_REMATCH[1]}"
    else [[ "$hp" == *,* || "$hp" == *:*:* ]] && return 1; D_HOST="${hp%%:*}"; fi
    IFS='&' read -ra kv <<<"$q"
    for k in "${kv[@]}"; do
      v="${k#*=}"; v="${v//%2F//}"; v="${v//%2f//}"
      case "${k%%=*}" in host|hostaddr) [[ -n "$D_HOST" && "$D_HOST" != "$v" ]] && return 1; D_HOST="$v";; dbname) D_DB="$v";; esac
    done
    [[ -z "$D_HOST" ]] && D_HOST="${PGHOSTADDR:-${PGHOST:-}}"
  elif [[ "$d" == *=* ]]; then
    [[ "$d" == *[\'\"\\]* ]] && return 1
    D_HOST=""; D_DB=""; local hosts=()
    read -ra kv <<<"$d"
    for k in "${kv[@]}"; do
      [[ "$k" == *=* ]] || return 1
      v="${k#*=}"
      case "${k%%=*}" in host|hostaddr) hosts+=("$v");; dbname) D_DB="$v";; service) return 1;; esac
    done
    [[ ${#hosts[@]} -eq 0 ]] && hosts=("${PGHOSTADDR:-${PGHOST:-}}")
    for v in "${hosts[@]}"; do [[ "$v" == *,* ]] && return 1; done
    for v in "${hosts[@]}"; do host_local "$v" || return 1; done
    D_HOST="${hosts[0]}"
  else
    D_DB="$d"; D_HOST="${PGHOSTADDR:-${PGHOST:-}}"
    [[ -n "${PGHOSTADDR:-}" && -n "${PGHOST:-}" ]] && { host_local "$PGHOST" || return 1; }
  fi
  host_local "$D_HOST" || return 1
  [[ "$D_DB" =~ [Rr][Ee][Ss][Tt][Oo][Rr][Ee]|[Dd][Rr][Ii][Ll][Ll]|[Tt][Ee][Ss][Tt] ]] || return 1
  return 0
}
host_local() { case "$1" in ""|localhost|127.0.0.1|::1|/*) return 0;; *) return 1;; esac; }

if ! destino_permitido "$DESTINO"; then
  (( PROD_OK == 1 )) || die "destino fuera de la allowlist (host local + base con restore/drill/test); podría ser PRODUCCIÓN. Me niego sin --permitir-prod"
  log "AVISO: --permitir-prod activo; se saltea la allowlist (PELIGROSO)"
fi
PG_RESTORE_CMD="${PG_RESTORE_CMD:-pg_restore}"

if [[ -f "$ARCHIVO.sha256" ]]; then
  ( cd "$(dirname "$ARCHIVO")" && sha256sum -c --quiet "$(basename "$ARCHIVO").sha256" ) >/dev/null 2>&1 \
    || die "checksum sha256 no coincide: archivo corrupto"
  log "sha256 OK"
else
  log "aviso: no hay .sha256 al lado; sigo solo con la verificación de descifrado"
fi

TMP="$(mktemp -d)"; chmod 700 "$TMP"
trap 'rm -rf "$TMP"' EXIT
trap 'exit 130' INT TERM HUP
descifrar() { gpg --batch --no-tty -q --decrypt "$ARCHIVO" 2>/dev/null | gunzip -c; }

LISTA="$TMP/toc.txt"
# pg_restore --list puede cerrar antes del final: se drena el resto para evitar SIGPIPE.
if ! descifrar | { "$PG_RESTORE_CMD" --list >"$LISTA" 2>/dev/null; echo $? >"$TMP/rc"; cat >/dev/null; }; then
  die "no se pudo descifrar/descomprimir: archivo corrupto o llave equivocada"
fi
[[ "$(cat "$TMP/rc")" == 0 ]] || die "pg_restore --list falló: dump inválido"
ENTRADAS="$(grep -cv '^;' "$LISTA" || true)"
[[ "$ENTRADAS" -gt 0 ]] || die "pg_restore --list sin entradas"
log "descifrado y pg_restore --list OK ($ENTRADAS entradas)"

if (( EJECUTAR == 0 )); then
  log "SIMULACRO: no se restauró nada. Para aplicar: agregá --ejecutar"
  exit 0
fi
log "restaurando en el destino indicado..."
descifrar | "$PG_RESTORE_CMD" --clean --if-exists --no-owner --no-acl --exit-on-error -d "$DESTINO"
log "restauración terminada"
