---
name: gh-keep-alive
description: Distingue el ping de Keep Render Alive de una caída real. Usar cuando ese workflow avise un status distinto de 200.
disable-model-invocation: true
---

# Keep Render Alive

Workflow: `.github/workflows/keep-alive.yml`
Check: `Keep Render Alive`

## Cuándo corre

Cada 10 minutos pinea /api/health para que Render no duerma. Un status distinto de 200 es warning. Quien abre el issue es E9, tras dos fallos.

## Qué hacer para que no salga en rojo

1. No conviertas este workflow en un deploy ni en un git push.
2. Si el ping falla de verdad, seguí el issue de E9 o D12. No alargues el cron para esconder la caída.
3. La URL sale de HEALTH_URL. No la hardcodees a producción en un archivo del repo.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
