---
name: gh-e15-spike
description: Respeta el comentario de spike de E15 en issues de bug, pago o POS. Usar al abrir o etiquetar un issue de producto, no para implementar el fix desde el workflow.
disable-model-invocation: true
---

# E15 spike comment

Workflow: `.github/workflows/product-issue-spike.yml`
Check: `E15 spike comment`

## Cuándo corre

Issue opened, labeled o reopened con labels bug, pago o pos, o esas palabras en el título. Comenta un spike. No implementa el arreglo.

## Qué hacer para que no salga en rojo

1. El comentario apunta a PedidoService, CheckoutPage o PosController y a un test. Seguí esa pista si vas a corregir el bug.
2. No conviertas el workflow en un bot que edita código de pago.
3. Dedup por marker: no borres el comentario para que vuelva a postear.

## Label de skip

Label `skip-product-spike` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
