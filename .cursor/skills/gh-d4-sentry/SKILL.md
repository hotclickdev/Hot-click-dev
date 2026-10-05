---
name: gh-d4-sentry
description: Atiende el digest diario de Sentry sin inventar un token. Usar cuando D4 o E8 abra un issue prod-errors.
disable-model-invocation: true
---

# D4 Sentry / E8 prod-errors

Workflow: `.github/workflows/sentry-digest.yml`
Check: `D4 Sentry / E8 prod-errors`

## Cuándo corre

Todos los días. Con SENTRY_TOKEN abre issues deduplicados. Sin token declara el skip. No inventa tokens.

## Qué hacer para que no salga en rojo

1. Sin SENTRY_TOKEN el skip es correcto. No lo pongas en el repo.
2. El issue prod-errors se corrige en el código que nombra, con test. No se cierra editando el workflow.
3. E16 es el recorte de Payment, Webhook y Factura. D4 es el digest general.

## Label de skip

Label `skip-sentry-digest` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
