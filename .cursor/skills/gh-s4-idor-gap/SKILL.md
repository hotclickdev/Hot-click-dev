---
name: gh-s4-idor-gap
description: Agrega un test de aislamiento cuando S4 marca un endpoint con id sin suite IDOR. Usar al tocar un GetMapping o PutMapping con id de recurso.
disable-model-invocation: true
---

# S4 IDOR suite gap

Workflow: `.github/workflows/idor-suite-gap.yml`
Check: `S4 IDOR suite gap`

## Cuándo corre

Los miércoles. Cruza endpoints /{id} con tests TenantIsolation o IDOR. Los stubs @Disabled no cuentan como cobertura.

## Qué hacer para que no salga en rojo

1. D2 muestra findById. S4 muestra que falta el test. Si tocás el endpoint, agregá el test de verdad.
2. No dejes el test en @Disabled para pintar el issue de verde.
3. El chequeo de tenant en el endpoint sigue siendo obligatorio (E2).

## Label de skip

Label `skip-idor-gap` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
