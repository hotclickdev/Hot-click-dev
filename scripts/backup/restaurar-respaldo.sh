#!/usr/bin/env bash
# ============================================================
# HOTCLICK — Restaurar un respaldo cifrado (INF-01)
# ============================================================
# Uso: restaurar-respaldo.sh --archivo <hotclick-*.dump.gz.gpg> --destino <base|URL>
#        [--ejecutar] [--permitir-prod]
# Por defecto es SIMULACRO (dry run): verifica sha256, descifra y corre
# pg_restore --list, pero no toca ninguna base.
# Se niega a restaurar sobre producción salvo --permitir-prod.
# Producción = destino que coincide con RESPALDO_PROD_PATRON
#   (def. '(^|[^a-z])prod|hotclick\.lat|^hotclick$').
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
PATRON="${RESPALDO_PROD_PATRON:-(^|[^a-z])prod|hotclick\.lat|^hotclick$}"
if grep -qiE "$PATRON" <<<"$DESTINO" && (( PROD_OK == 0 )); then
  die "el destino parece PRODUCCIÓN; me niego sin --permitir-prod"
fi
PG_RESTORE_CMD="${PG_RESTORE_CMD:-pg_restore}"

if [[ -f "$ARCHIVO.sha256" ]]; then
  ( cd "$(dirname "$ARCHIVO")" && sha256sum -c --quiet "$(basename "$ARCHIVO").sha256" ) >/dev/null 2>&1 \
    || die "checksum sha256 no coincide: archivo corrupto"
  log "sha256 OK"
else
  log "aviso: no hay .sha256 al lado; sigo solo con la verificación de descifrado"
fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
DUMP="$TMP/hotclick.dump"
gpg --batch --no-tty -q --decrypt "$ARCHIVO" 2>/dev/null | gunzip -c >"$DUMP" \
  || die "no se pudo descifrar/descomprimir: archivo corrupto o llave equivocada"
[[ -s "$DUMP" ]] || die "dump vacío"
ENTRADAS="$("$PG_RESTORE_CMD" --list "$DUMP" 2>/dev/null | grep -cv '^;')" || die "pg_restore --list falló: dump inválido"
[[ "$ENTRADAS" -gt 0 ]] || die "pg_restore --list sin entradas"
log "descifrado y pg_restore --list OK ($ENTRADAS entradas)"

if (( EJECUTAR == 0 )); then
  log "SIMULACRO: no se restauró nada. Para aplicar: agregá --ejecutar"
  exit 0
fi
log "restaurando en el destino indicado..."
"$PG_RESTORE_CMD" --clean --if-exists --no-owner --no-acl --exit-on-error -d "$DESTINO" "$DUMP"
log "restauración terminada"
