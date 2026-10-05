---
name: gh-d7-i18n-drift
description: Completa keys faltantes entre es, en y pt cuando D7 abre un issue de drift. Usar al trabajar ese issue, no para reescribir todos los locales en un PR de producto.
disable-model-invocation: true
---

# D7 i18n drift

Workflow: `.github/workflows/i18n-drift.yml`
Check: `D7 i18n drift`

## Cuándo corre

Todos los días. Compara es.json, en.json y pt.json del árbol. El PR nuevo lo cubre E17.

## Qué hacer para que no salga en rojo

1. Una key que está en es y falta en en o pt se agrega en los tres con el mismo camino.
2. No mezcles el backlog entero con un cambio de UI. E17 solo exige las keys del diff.
3. No borres locales para dejar el issue en cero.

## Label de skip

Label `skip-i18n-drift` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
