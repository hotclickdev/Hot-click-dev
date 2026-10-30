#!/usr/bin/env bash
# ============================================================
# HOTCLICK — Respaldo diario a la PC local de Andrés (INF-01)
# ============================================================
# Corre EN LA PC (Linux o WSL en Windows). Modelo "pull": la PC se conecta
# al servidor por SSH; el servidor nunca tiene acceso a la PC.
#
# Modos (RESPALDO_MODO):
#   dump    (def.) corre pg_dump remoto por SSH y cifra localmente con la
#           llave PÚBLICA. El dump en claro solo pasa por la tubería.
#   archivo trae por SSH el último *.dump.gz.gpg que dejó en el servidor
#           scripts/backup/backup-local-gpg.sh (ya cifrado allá).
#
# Variables:
#   RESPALDO_SSH_DESTINO   usuario@servidor (placeholder; nunca en el repo)
#   RESPALDO_SSH_LLAVE     ruta a la llave SSH restringida (opcional)
#   RESPALDO_DIR           carpeta destino en la PC (def. $HOME/hotclick-respaldos)
#   RESPALDO_GPG_RECIPIENT fingerprint de la llave pública "HotClick Backups"
#   RESPALDO_GPG_PUBKEY    ruta al .asc público (opcional; GNUPGHOME temporal)
#   RESPALDO_DIARIOS       def. 14   RESPALDO_SEMANALES  def. 8
#   RESPALDO_REMOTE_CMD    comando remoto que escribe el dump -Fc a stdout
#                          (def. docker exec hotclick-postgres pg_dump -U "$DB_USERNAME" -d hotclick -Fc)
#   RESPALDO_REMOTE_DIR    carpeta remota en modo archivo (def. /var/backups/hotclick)
#   RESPALDO_FUENTE_CMD    (pruebas) reemplaza todo el SSH: comando local que
#                          escribe el dump (modo dump) o el .gpg (modo archivo)
#   PG_RESTORE_CMD         def. pg_restore
# Log sin datos personales: solo nombre de archivo, bytes y conteos.
set -euo pipefail
umask 077

log() { echo "respaldo: $(date -u +%FT%TZ) $*"; }
die() { echo "respaldo: ERROR: $*" >&2; exit 1; }

MODO="${RESPALDO_MODO:-dump}"
DIR="${RESPALDO_DIR:-$HOME/hotclick-respaldos}"
RECIPIENT="${RESPALDO_GPG_RECIPIENT:-}"
DIARIOS="${RESPALDO_DIARIOS:-14}"
SEMANALES="${RESPALDO_SEMANALES:-8}"
PG_RESTORE_CMD="${PG_RESTORE_CMD:-pg_restore}"

[[ "$DIARIOS" =~ ^[1-9][0-9]*$ && "$SEMANALES" =~ ^[0-9]+$ ]] || die "RESPALDO_DIARIOS/SEMANALES inválidos"
command -v gpg >/dev/null || die "gpg no está instalado"
command -v sha256sum >/dev/null || die "sha256sum no está instalado"

fuente() {
  if [[ -n "${RESPALDO_FUENTE_CMD:-}" ]]; then bash -c "$RESPALDO_FUENTE_CMD"; return; fi
  [[ -n "${RESPALDO_SSH_DESTINO:-}" ]] || die "falta RESPALDO_SSH_DESTINO"
  local ssh=(ssh -o BatchMode=yes -o ConnectTimeout=20)
  [[ -n "${RESPALDO_SSH_LLAVE:-}" ]] && ssh+=(-i "$RESPALDO_SSH_LLAVE" -o IdentitiesOnly=yes)
  if [[ "$MODO" == dump ]]; then
    "${ssh[@]}" "$RESPALDO_SSH_DESTINO" "${RESPALDO_REMOTE_CMD:-docker exec hotclick-postgres sh -c 'pg_dump -U \"\$POSTGRES_USER\" -d hotclick -Fc'}"
  else
    local rdir="${RESPALDO_REMOTE_DIR:-/var/backups/hotclick}"
    "${ssh[@]}" "$RESPALDO_SSH_DESTINO" "f=\$(ls -1 $rdir/hotclick-*.dump.gz.gpg | sort | tail -n1) && cat \"\$f\""
  fi
}

TMP_GNUPG=""; PARTIAL=""
cleanup() { [[ -n "$PARTIAL" && -e "$PARTIAL" ]] && rm -f "$PARTIAL"; [[ -n "$TMP_GNUPG" ]] && rm -rf "$TMP_GNUPG"; return 0; }
trap cleanup EXIT
GPG=(gpg --batch --yes --no-tty --trust-model always)

mkdir -p "$DIR"; chmod 700 "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$DIR/hotclick-$STAMP.dump.gz.gpg"
PARTIAL="$FINAL.partial"

if [[ "$MODO" == dump ]]; then
  [[ -n "$RECIPIENT" ]] || die "falta RESPALDO_GPG_RECIPIENT"
  if [[ -n "${RESPALDO_GPG_PUBKEY:-}" ]]; then
    grep -q "PRIVATE KEY" "$RESPALDO_GPG_PUBKEY" && die "RESPALDO_GPG_PUBKEY parece PRIVADA; usá solo la pública"
    TMP_GNUPG="$(mktemp -d)"
    "${GPG[@]}" --homedir "$TMP_GNUPG" --import "$RESPALDO_GPG_PUBKEY" >/dev/null 2>&1 || die "no se pudo importar la llave pública"
    GPG+=(--homedir "$TMP_GNUPG")
  fi
  "${GPG[@]}" --list-keys "$RECIPIENT" >/dev/null 2>&1 || die "no encuentro la llave pública"
  LISTA="$(mktemp)"
  # tee valida el formato custom con pg_restore --list sin escribir el dump en claro a disco.
  if ! fuente | tee >("$PG_RESTORE_CMD" --list >"$LISTA" 2>/dev/null; echo $? >"$LISTA.rc") \
       | gzip -c | "${GPG[@]}" --encrypt --recipient "$RECIPIENT" --output "$PARTIAL"; then
    rm -f "$LISTA" "$LISTA.rc"; die "falló el dump remoto o el cifrado; no se guardó nada"
  fi
  for _ in $(seq 1 50); do [[ -s "$LISTA.rc" ]] && break; sleep 0.1; done
  RC="$(cat "$LISTA.rc" 2>/dev/null || echo 99)"; ENTRADAS="$(grep -cv '^;' "$LISTA" || true)"
  rm -f "$LISTA" "$LISTA.rc"
  [[ "$RC" == 0 && "$ENTRADAS" -gt 0 ]] || die "el dump no pasó pg_restore --list; no se guardó"
else
  fuente >"$PARTIAL" || die "no se pudo traer el respaldo del servidor"
  ENTRADAS="n/d"
fi

[[ -s "$PARTIAL" ]] || die "el respaldo quedó vacío"
PAQ="$("${GPG[@]}" --list-packets "$PARTIAL" 2>/dev/null || true)"
grep -q "pubkey enc packet" <<<"$PAQ" || die "el archivo no está cifrado"
chmod 600 "$PARTIAL"; mv "$PARTIAL" "$FINAL"; PARTIAL=""
( cd "$DIR" && sha256sum "$(basename "$FINAL")" >"$(basename "$FINAL").sha256" && chmod 600 "$(basename "$FINAL").sha256" )

# Retención: últimos N diarios + el más nuevo de cada una de las últimas M semanas ISO.
mapfile -t TODOS < <(ls -1 "$DIR"/hotclick-*.dump.gz.gpg 2>/dev/null | sort -r)
declare -A KEEP=() SEM=()
n=0; s=0
for f in "${TODOS[@]}"; do
  n=$((n+1)); (( n <= DIARIOS )) && KEEP["$f"]=1
  d="$(basename "$f" | sed -E 's/^hotclick-([0-9]{8})T.*/\1/')"
  w="$(date -u -d "$d" +%G-%V)"
  if [[ -z "${SEM[$w]:-}" ]]; then SEM[$w]=1; s=$((s+1)); (( s <= SEMANALES )) && KEEP["$f"]=1; fi
done
borrados=0
for f in "${TODOS[@]}"; do
  [[ -n "${KEEP[$f]:-}" ]] || { rm -f -- "$f" "$f.sha256"; borrados=$((borrados+1)); }
done
log "OK $(basename "$FINAL") $(stat -c %s "$FINAL") bytes; entradas=$ENTRADAS; conservados=${#KEEP[@]}; borrados=$borrados"
