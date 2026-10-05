---
name: gh-s3-e2e-gap
description: Usa el mapa semanal de huecos e2e sin meter specs pendientes en la suite de CI. Usar cuando S3 abra un issue de cobertura.
disable-model-invocation: true
---

# S3 E2E gap map

Workflow: `.github/workflows/e2e-gap-map.yml`
Check: `S3 E2E gap map`

## Cuándo corre

Los martes. Cruza checkout, POS, finanzas, 2FA, SINPE, wallet y Hacienda contra specs. Los stubs de frontend/tests/pending no entran en test:e2e:ci.

## Qué hacer para que no salga en rojo

1. Un hueco se cubre con un spec real cuando se toca ese flujo, no con un stub que flakea CI.
2. No muevas tests/pending a la suite de CI para "cerrar" el issue.
3. E5 elige specs en el PR. S3 es el mapa semanal.

## Label de skip

Label `skip-e2e-gap` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
