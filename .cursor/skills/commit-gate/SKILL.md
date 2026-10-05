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
5. Si el diff toca `Hot_click_outlet/frontend/src/**`, seguí `.cursor/skills/gh-e3-static/SKILL.md` y meté `static/` en el mismo commit. Sin ese build, el check E3 sale en rojo aunque E4 diga LISTO.
6. Para el resto de checks de GitHub que el diff dispara, seguí `.cursor/skills/github-acciones/SKILL.md`.

Detalle de comandos: regla `.cursor/rules/commit-gate.mdc`.
