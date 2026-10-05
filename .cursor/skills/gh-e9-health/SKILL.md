---
name: gh-e9-health
description: Atiende el pager E9 cuando /api/health no responde 200 dos veces seguidas. Usar cuando se abra un issue outage por el health pager.
disable-model-invocation: true
---

# E9 /api/health pager

Workflow: `.github/workflows/health-pager.yml`
Check: `E9 /api/health pager`

## Cuándo corre

Cada 10 minutos. Dos respuestas distintas de 200 seguidas abren un issue outage y, si hay secretos, avisan por Telegram. No hace git push.

## Qué hacer para que no salga en rojo

1. Mirar el issue outage. No se cierra con un commit que cambie el workflow para que el curl no falle.
2. keep-alive.yml solo pinea Render. E9 es el que abre el issue. D12 mira además el cuerpo de la respuesta.
3. No inventes HEALTH_URL ni pegues tokens de Telegram.

## Label de skip

Label `skip-health-pager` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
