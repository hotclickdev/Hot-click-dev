---
name: gh-i1-inspect
description: Mantiene el catálogo de agentes cuando I1 inspecciona workflows y docs. Usar al agregar un workflow de eng-gates o cuando el inspector falle.
disable-model-invocation: true
---

# I1 escanear workflows + docs

Workflow: `.github/workflows/inspect-agents.yml`
Check: `I1 escanear workflows + docs`

## Cuándo corre

Los lunes. Escanea workflows y docs. El JSON va a agentes-dashboard y a Hot_click_outlet/src/main/resources/agentes/. No es un gate de producto.

## Qué hacer para que no salga en rojo

1. Un workflow nuevo de eng-gates se documenta en docs/AGENTES_ENG_GATES.md o en la ola que corresponda, y tiene su skill en .cursor/skills/github-acciones/SKILL.md.
2. No es un permiso para cambiar pago, auth ni schedulers de negocio.
3. Si el inspector falla, arreglá el catálogo o el script. No borres el workflow para que el escaneo quede vacío.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
