#!/bin/sh
# Instala el hook pre-commit versionado (scripts/hooks/pre-commit) en .git/hooks/.
# Correr una vez por clon del repo: sh scripts/install-git-hooks.sh

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cp "$REPO_ROOT/scripts/hooks/pre-commit" "$REPO_ROOT/.git/hooks/pre-commit"
chmod +x "$REPO_ROOT/.git/hooks/pre-commit"

echo "[install-git-hooks] Hook pre-commit instalado en .git/hooks/pre-commit"
echo "[install-git-hooks] Para cobertura completa de secretos, instala gitleaks:"
echo "[install-git-hooks]   https://github.com/gitleaks/gitleaks#installing"
