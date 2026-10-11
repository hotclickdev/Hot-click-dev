#!/usr/bin/env bash
# Arma el remote rclone "gd:" (carpeta de backups en Google Drive) SOLO con variables de entorno
# (RCLONE_CONFIG_GD_*): no se escribe ningún archivo de config ni hay secretos en el repo.
# Lo usan el server (hotclick-db-backup.sh) y CI (scripts/eng-gates/backup-offsite.sh).
#
# El modo se elige según qué credencial esté presente (tiene que haber exactamente una):
#   OAuth de usuario (RECOMENDADO, gratis, Gmail personal):
#     GDRIVE_CLIENT_ID + GDRIVE_CLIENT_SECRET + GDRIVE_RCLONE_TOKEN   scope drive.file
#   Service account (solo si la carpeta está en una unidad compartida de Google Workspace, pago):
#     GDRIVE_SA_JSON (contenido) o GDRIVE_SA_JSON_FILE (ruta)   + GDRIVE_SHARED_DRIVE_ID
#     Un service account no tiene cuota: en "Mi unidad" de un Gmail falla con storageQuotaExceeded.
#   Solo tests: GDRIVE_LOCAL_TEST_DIR (backend local de rclone, simula Drive)
# Siempre: GDRIVE_FOLDER_ID = id de la carpeta de backups (root del remote).

gdrive_fail() { echo "FAIL: $*" >&2; return 1; }

gdrive_rclone_env() {
  export RCLONE_CONFIG=/dev/null   # nunca leer/escribir un rclone.conf del disco
  local oauth=0 sa=0
  [[ -n "${GDRIVE_RCLONE_TOKEN:-}${GDRIVE_CLIENT_ID:-}${GDRIVE_CLIENT_SECRET:-}" ]] && oauth=1
  [[ -n "${GDRIVE_SA_JSON:-}${GDRIVE_SA_JSON_FILE:-}" ]] && sa=1

  if [[ -n "${GDRIVE_LOCAL_TEST_DIR:-}" ]]; then
    mkdir -p "$GDRIVE_LOCAL_TEST_DIR"
    export RCLONE_CONFIG_GDRAW_TYPE=local
    export RCLONE_CONFIG_GD_TYPE=alias
    export RCLONE_CONFIG_GD_REMOTE="gdraw:$GDRIVE_LOCAL_TEST_DIR"
    return 0
  fi

  [[ -n "${GDRIVE_FOLDER_ID:-}" ]] || { gdrive_fail "falta GDRIVE_FOLDER_ID (id de la carpeta de backups)"; return 1; }
  if (( oauth + sa == 0 )); then
    gdrive_fail "no hay credenciales de Drive: definí GDRIVE_CLIENT_ID/GDRIVE_CLIENT_SECRET/GDRIVE_RCLONE_TOKEN (recomendado) o GDRIVE_SA_JSON + GDRIVE_SHARED_DRIVE_ID"
    return 1
  fi
  if (( oauth + sa == 2 )); then
    gdrive_fail "hay credenciales OAuth y de service account a la vez: dejá solo una"
    return 1
  fi

  export RCLONE_CONFIG_GD_TYPE=drive
  export RCLONE_CONFIG_GD_ROOT_FOLDER_ID="$GDRIVE_FOLDER_ID"
  if (( oauth )); then
    local v
    for v in GDRIVE_CLIENT_ID GDRIVE_CLIENT_SECRET GDRIVE_RCLONE_TOKEN; do
      [[ -n "${!v:-}" ]] || { gdrive_fail "modo OAuth: falta $v"; return 1; }
    done
    export RCLONE_CONFIG_GD_SCOPE=drive.file
    export RCLONE_CONFIG_GD_CLIENT_ID="$GDRIVE_CLIENT_ID"
    export RCLONE_CONFIG_GD_CLIENT_SECRET="$GDRIVE_CLIENT_SECRET"
    export RCLONE_CONFIG_GD_TOKEN="$GDRIVE_RCLONE_TOKEN"
  else
    [[ -n "${GDRIVE_SHARED_DRIVE_ID:-}" ]] || {
      gdrive_fail "modo service account: falta GDRIVE_SHARED_DRIVE_ID. Un service account no tiene cuota en Drive; solo funciona dentro de una unidad compartida (Workspace)"
      return 1
    }
    export RCLONE_CONFIG_GD_SCOPE=drive
    export RCLONE_CONFIG_GD_TEAM_DRIVE="$GDRIVE_SHARED_DRIVE_ID"
    if [[ -n "${GDRIVE_SA_JSON:-}" ]]; then
      export RCLONE_CONFIG_GD_SERVICE_ACCOUNT_CREDENTIALS="$GDRIVE_SA_JSON"
    else
      export RCLONE_CONFIG_GD_SERVICE_ACCOUNT_FILE="$GDRIVE_SA_JSON_FILE"
    fi
  fi
}

# Nombre del backup más nuevo (hotclick-AAAAMMDDTHHMMSSZ.dump.age: el orden por nombre es el orden por
# fecha UTC). Solo mira archivos de backup; nada más de la carpeta.
gdrive_latest() {
  rclone lsf gd: --files-only --max-depth 1 --include 'hotclick-*.dump.age' | sort -r | head -n1
}

# Hora UTC (epoch) codificada en el nombre del backup.
gdrive_epoch_de() {
  local n="${1#hotclick-}"; n="${n%%.dump.age}"
  [[ "$n" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$ ]] || return 1
  date -u -d "${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}:${BASH_REMATCH[5]}:${BASH_REMATCH[6]}" +%s
}
