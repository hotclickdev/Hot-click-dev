---
name: commit-gate
description: Verifica lints y tests del diff antes de git commit. Usar cuando el usuario pide commit, revisar cambios para commitear, o el agente va a ejecutar git commit.
---

# Commit gate

Antes de `git add` / `git commit`:

1. Lanzá el subagente `commit-gate` (`.cursor/agents/commit-gate.md`) **o** ejecutá su checklist vos mismo.
2. No commitees si el veredicto es BLOQUEADO.
3. No uses `--no-verify`.
4. Excluí debug NDJSON, secretos y artefactos de test.

Detalle de comandos: regla `.cursor/rules/commit-gate.mdc`.
