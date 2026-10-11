#!/usr/bin/env bash
# CI: age + cliente PostgreSQL 18 (prod corre postgres:18; pg_restore no lee dumps de una versión mayor).
set -euo pipefail
sudo apt-get update -qq
sudo apt-get install -y -qq age postgresql-common >/dev/null
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
sudo apt-get install -y -qq postgresql-client-18 >/dev/null
echo "/usr/lib/postgresql/18/bin" >> "${GITHUB_PATH:-/dev/null}"
/usr/lib/postgresql/18/bin/pg_restore --version
age --version
