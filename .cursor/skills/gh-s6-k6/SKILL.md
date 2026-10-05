---
name: gh-s6-k6
description: Mantiene los umbrales k6 dentro del baseline sin apuntar el smoke a producción. Usar al cambiar loadtest, el pool Hikari o el baseline.
disable-model-invocation: true
---

# S6 k6 / Hikari

Workflow: `.github/workflows/k6-hikari-regression.yml`
Check: `S6 k6 / Hikari`

## Cuándo corre

Los lunes. Lee umbrales p95 y http_req_failed. El smoke va a un mock o a K6_BASE_URL de staging. No pega a hotclick.lat salvo K6_ALLOW_PRODUCTION=1.

## Qué hacer para que no salga en rojo

1. Si cambiás un umbral, actualizá scripts/eng-gates/baselines/k6-hikari.json con motivo, no para que un rojo pase.
2. No apuntes el script a la IP de producción.
3. Hikari se lee del pool configurado. No llames /api/admin/observabilidad (pide JWT de admin).

## Label de skip

Label `skip-k6-hikari` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
