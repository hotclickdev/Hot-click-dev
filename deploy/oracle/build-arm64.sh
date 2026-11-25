#!/usr/bin/env bash
# Construye la imagen de la app para linux/arm64 (Oracle Always Free A1.Flex).
# NO hace push a ningún registro: la imagen queda cargada en el Docker local
# (--load) o, si se pide, exportada a un .tar (--output type=docker).
#
# Uso:
#   deploy/oracle/build-arm64.sh                 # carga hot_click_outlet-app:arm64 en Docker local
#   deploy/oracle/build-arm64.sh --tar out.tar   # exporta a un archivo (para scp a la VM)
#
# Variables opcionales:
#   IMAGE_TAG       (default: hot_click_outlet-app:arm64)
#   BUILD_NETWORK   (ej. "host": para hosts sin red bridge de Docker)
#
# En la VM Oracle (ya aarch64) no hace falta emulación: el build es nativo y rápido.
# En un host x86_64 hace falta qemu-user-static + binfmt (emulación, MUY lento: 20-60 min).
#
# OBLIGATORIO antes: el frontend ya viene compilado en src/main/resources/static/
# (pnpm build + commit). La imagen NO compila React.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTEXT="${REPO_ROOT}/Hot_click_outlet"          # coherente con docker-compose.lightsail.yml (build: .)
IMAGE_TAG="${IMAGE_TAG:-hot_click_outlet-app:arm64}"
TAR_OUT=""

if [ "${1:-}" = "--tar" ]; then
  TAR_OUT="${2:?uso: --tar archivo.tar}"
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "ERROR: falta docker buildx." >&2; exit 1
fi

if [ "$(uname -m)" != "aarch64" ] && [ ! -e /proc/sys/fs/binfmt_misc/qemu-aarch64 ]; then
  echo "ERROR: host no-ARM sin emulación qemu-aarch64 registrada (instalar qemu-user-static / binfmt)." >&2
  exit 1
fi

if [ ! -f "${CONTEXT}/src/main/resources/static/index.html" ]; then
  echo "ERROR: falta el frontend compilado en ${CONTEXT}/src/main/resources/static/ (correr pnpm build y commitear)." >&2
  exit 1
fi

NET_ARGS=()
[ -n "${BUILD_NETWORK:-}" ] && NET_ARGS=(--network "${BUILD_NETWORK}")

if [ -n "${TAR_OUT}" ]; then
  OUT_ARGS=(--output "type=docker,dest=${TAR_OUT}")
else
  OUT_ARGS=(--load)
fi

# Sin --push: nunca se publica a un registro.
docker buildx build \
  --platform linux/arm64 \
  "${NET_ARGS[@]}" \
  -f "${CONTEXT}/Dockerfile" \
  -t "${IMAGE_TAG}" \
  "${OUT_ARGS[@]}" \
  "${CONTEXT}"

echo "OK: ${IMAGE_TAG} (linux/arm64) ${TAR_OUT:+-> ${TAR_OUT}}"
