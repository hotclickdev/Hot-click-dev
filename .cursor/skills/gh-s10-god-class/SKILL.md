---
name: gh-s10-god-class
description: Toma como máximo un extract move-only del issue S10, fuera de pago y auth. Usar cuando el job de god-class publique candidatos.
disable-model-invocation: true
---

# S10 god-class candidates

Workflow: `.github/workflows/god-class-extract.yml`
Check: `S10 god-class candidates`

## Cuándo corre

Los miércoles. Lista los archivos más largos y propone un solo extract. No abre un PR masivo. Deja afuera Payment, Auth, Pos, Sinpe y Wallet.

## Qué hacer para que no salga en rojo

1. Si hacés el extract, es mover código, mismo orden de llamadas. No cambies comportamiento en ese PR.
2. No partas pago, auth, 2FA, POS ni el wizard de producto en el mismo pase.
3. Un issue con quince archivos no es una orden de reescribirlos todos.

## Label de skip

Label `skip-god-class` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
