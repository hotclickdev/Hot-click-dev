---
name: gh-e12-seller-qa
description: Mantiene el mapa de rutas seller para que E12 Seller QA remap no falle. Usar al tocar /emprendedor, /pyme, /negocio-plus o el wizard.
disable-model-invocation: true
---

# E12 Seller QA remap

Workflow: `.github/workflows/seller-qa-remap.yml`
Check: `E12 Seller QA remap`

## Cuándo corre

Pull request que toca frontend/src/prototipo/** o el wizard seller.

## Qué hacer para que no salga en rojo

1. Seguí .cursor/skills/hotclick-seller-qa/SKILL.md.
2. Si movés una ruta de /emprendedor, /pyme o /negocio-plus, actualizá el mapa que el gate compara.
3. El smoke de Playwright es opt-in (run_smoke). El dry-run del mapa sí corre en el PR.

## Label de skip

Label `skip-seller-qa` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
