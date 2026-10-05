---
name: gh-ci-telegram
description: Explica la alerta de Telegram cuando CI falla. Usar cuando llegue el mensaje FALLO EN CI/CD o el check Notificar fallo en Telegram aparezca skipped o en rojo.
disable-model-invocation: true
---

# Notificar fallo en Telegram

Workflow: `.github/workflows/ci.yml`
Check: `Notificar fallo en Telegram`

## Cuándo corre

Job de ci.yml que corre solo si Tests Java o Build React fallan. Manda el enlace del run a Telegram.

## Qué hacer para que no salga en rojo

1. Este check skipped en un PR verde es lo normal. No hay nada que commitear.
2. Si Telegram avisó, abrí el run y corregí Tests Java o Build React. No silencies el curl.
3. No pegues TELEGRAM_BOT_TOKEN en el repo ni en el chat.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
