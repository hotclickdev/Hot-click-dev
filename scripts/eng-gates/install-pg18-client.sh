#!/usr/bin/env bash
# CI: age + rclone + cliente PostgreSQL 18 (prod corre postgres:18; pg_restore no lee dumps de una versión mayor).
set -euo pipefail
sudo apt-get update -qq
sudo apt-get install -y -qq age postgresql-common unzip >/dev/null
# rclone oficial (el de apt es viejo)
curl -fsSL https://rclone.org/install.sh | sudo bash >/dev/null
rclone version | head -n1
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
sudo apt-get install -y -qq postgresql-client-18 >/dev/null
echo "/usr/lib/postgresql/18/bin" >> "${GITHUB_PATH:-/dev/null}"
/usr/lib/postgresql/18/bin/pg_restore --version
age --version
