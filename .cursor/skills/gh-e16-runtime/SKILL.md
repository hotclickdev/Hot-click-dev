---
name: gh-e16-runtime
description: Atiende el issue de E16 sobre errores de Payment, Webhook o Factura en Sentry. Usar cuando ese job abra un issue o falle por falta de token.
disable-model-invocation: true
---

# E16 Payment/Webhook/Factura

Workflow: `.github/workflows/runtime-endpoint-issue.yml`
Check: `E16 Payment/Webhook/Factura`

## Cuándo corre

Diario. Con SENTRY_TOKEN lista unresolved de PaymentController, WebhookController y FacturaController. Sin token, el cron hace skip honesto.

## Qué hacer para que no salga en rojo

1. Si no hay token, no inventes uno ni lo commitees. El skip del cron es el comportamiento esperado.
2. El issue trae pistas de idempotencia (stripe_event_id, txn). No cambies FacturacionContingenciaScheduler "de paso".
3. Un fix de pago va con su test nominal (E11) y sin mezclar refactor.

## Label de skip

Label `skip-runtime-endpoint` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
