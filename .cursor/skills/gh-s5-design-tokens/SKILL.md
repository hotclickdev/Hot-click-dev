---
name: gh-s5-design-tokens
description: Usa tokens hc-* en vez de hex sueltos cuando S5 marque design-drift. Usar al escribir CSS o style inline en el frontend.
disable-model-invocation: true
---

# S5 design-drift

Workflow: `.github/workflows/design-tokens-drift.yml`
Check: `S5 design-drift`

## Cuándo corre

Los lunes. Busca hex y style={{ }} en frontend/src fuera de hotclick-tokens.css. Abre un issue. No abre un PR que reescriba la UI.

## Qué hacer para que no salga en rojo

1. UI nueva sigue el manual de marca: tokens hc-*, no un color hex nuevo.
2. No hagas un codemod masivo de todos los hex en el mismo PR de una feature.
3. .hc-superadmin-theme se respeta. No lo "unifiques" con el tema de la tienda.

## Label de skip

Label `skip-design-tokens` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
