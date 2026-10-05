---
name: gh-e4-commit-gate
description: Deja el diff sin secretos ni debug y con tests del área en verde para que E4 Commit-gate VEREDICTO no salga BLOQUEADO. Usar antes de commit o pull request.
disable-model-invocation: true
---

# E4 Commit-gate VEREDICTO

Workflow: `.github/workflows/commit-gate.yml`
Check: `E4 Commit-gate VEREDICTO`

## Cuándo corre

Todo pull request a master. También se puede disparar a mano.

## Qué hacer para que no salga en rojo

1. Seguí .cursor/skills/commit-gate/SKILL.md y el subagente commit-gate.
2. Sacá del diff debug NDJSON, .env, reportes Playwright, node_modules y results.json de Vitest.
3. Frontend tocado: pnpm test. Java tocado: mvn test de esas clases.
4. E4 en verde no sustituye el pnpm build de E3. Si cambió frontend/src, igual commiteá static/.

## Label de skip

Label `skip-commit-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
