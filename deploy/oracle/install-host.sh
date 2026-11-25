#!/usr/bin/env bash
# Prepara el HOST (Ubuntu 24.04 aarch64) de la VM Oracle Always Free para correr HOTCLICK.
# Idempotente: se puede correr varias veces. Correr como root: sudo bash install-host.sh
#
# Hace: Docker Engine + plugin compose, usuario `hotclick`, swap, firewall del host (ufw).
# NO hace: arrancar la app, crear recursos en Oracle, emitir certificados ni tocar DNS.
#
# IMPORTANTE — además del firewall del host hay que abrir 80/443 en la Security List de OCI
# (autorización de Andrés; ver README-ORACLE.md paso 3). Sin eso, ufw permite pero OCI bloquea.
# Las imágenes de Ubuntu de OCI traen reglas iptables propias que rechazan casi todo: este script
# las deja coherentes con ufw (ver sección firewall).
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-hotclick}"
SWAP_SIZE="${SWAP_SIZE:-4G}"

[ "$(id -u)" -eq 0 ] || { echo "Correr como root (sudo)." >&2; exit 1; }
if [ "$(uname -m)" != "aarch64" ]; then
  echo "AVISO: este host es $(uname -m), no aarch64 (pensado para A1.Flex)." >&2
fi
export DEBIAN_FRONTEND=noninteractive

# ── 1. Paquetes base ─────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw nginx certbot python3-certbot-nginx

# ── 2. Docker Engine + compose plugin (repo oficial de Docker, arm64) ────────
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# ── 3. Usuario de despliegue ─────────────────────────────────────────────────
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"
# Copia las llaves SSH autorizadas del usuario actual de OCI (ubuntu) para poder entrar como hotclick.
if [ -f /home/ubuntu/.ssh/authorized_keys ] && [ ! -f "/home/${DEPLOY_USER}/.ssh/authorized_keys" ]; then
  install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  install -m 600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /home/ubuntu/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

# ── 4. Swap (JVM + Postgres + build pueden pisar RAM) ────────────────────────
if [ "$(swapon --show --noheadings | wc -l)" -eq 0 ]; then
  if [ ! -f /swapfile ]; then
    fallocate -l "${SWAP_SIZE}" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-hotclick-swap.conf
fi

# ── 5. Firewall del host ─────────────────────────────────────────────────────
# default deny incoming / allow outgoing; permitir 22, 80, 443. 8080 y 5432 quedan cerrados
# desde fuera (la app escucha solo en 127.0.0.1:8080 y Postgres no se publica).
# OJO: poner 22 ANTES de activar ufw para no perder el SSH.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'ssh'
ufw allow 80/tcp comment 'http'
ufw allow 443/tcp comment 'https'
ufw deny 8080/tcp comment 'app solo via nginx'
ufw deny 5432/tcp comment 'postgres nunca expuesto'
ufw --force enable

# Imágenes Ubuntu de OCI: INPUT trae un REJECT final (icmp-host-prohibited) que puede bloquear
# 80/443 aunque ufw permita. Si existe, se insertan ACCEPT 80/443 justo antes de ese REJECT.
if command -v iptables >/dev/null 2>&1; then
  REJECT_LINE="$(iptables -L INPUT --line-numbers -n 2>/dev/null | awk '$2=="REJECT"{print $1; exit}')"
  if [ -n "${REJECT_LINE}" ]; then
    for p in 80 443; do
      iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || {
        REJECT_LINE="$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')"
        iptables -I INPUT "${REJECT_LINE}" -p tcp -m state --state NEW --dport "$p" -j ACCEPT
      }
    done
    if command -v netfilter-persistent >/dev/null 2>&1; then netfilter-persistent save || true; fi
  fi
fi

# Nginx instalado pero sin sitio propio todavía: se deja el default hasta copiar nginx-hotclick.conf.example.
systemctl enable nginx

echo
echo "Listo. Pendiente (NO lo hace este script):"
echo "  - Abrir 80/443 en la Security List de OCI (requiere autorización de Andrés)."
echo "  - Crear deploy/oracle/.env en el servidor, construir imagen y 'docker compose up' (README-ORACLE.md)."
echo "  - Cerrar sesión y volver a entrar para que '${DEPLOY_USER}' tome el grupo docker."
