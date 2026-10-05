---
name: gh-s2-dependabot-weekly
description: Clasifica los pull requests de Dependabot que siguen abiertos, sin mergear majors. Usar cuando S2 comente un PR de dependencias.
disable-model-invocation: true
---

# S2 Dependabot weekly

Workflow: `.github/workflows/dependabot-weekly.yml`
Check: `S2 Dependabot weekly`

## Cuándo corre

Los lunes. Reusa la clasificación de E6. Patch o minor con CI verde puede recibir automerge-candidate. Los majors van a un issue needs-human.

## Qué hacer para que no salga en rojo

1. No mergees un major desde este comentario.
2. safe-to-automerge lo pone una persona, no el agente, y nunca si hay needs-human.
3. E6 corre al abrir. S2 barre la cola.

## Label de skip

Label `skip-deps-weekly` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
