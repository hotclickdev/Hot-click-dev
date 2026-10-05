---
name: gh-d11-api-drift
description: Alinea un endpoint Java con el service de frontend cuando D11 marca api-drift. Usar al agregar una ruta /api o un cliente axios.
disable-model-invocation: true
---

# D11 api-drift

Workflow: `.github/workflows/api-contract-drift.yml`
Check: `D11 api-drift`

## Cuándo corre

Todos los días. Compara @RequestMapping y @GetMapping con frontend/src/services. Abre un issue con 404 heurísticos.

## Qué hacer para que no salga en rojo

1. Si agregás un endpoint, el service de frontend tiene que llamar esa ruta, o el endpoint no se publica todavía y no hace falta cliente.
2. E10 exige la regla de seguridad. D11 mira el contrato. Cumplí los dos.
3. No borres mappings para vaciar el issue.

## Label de skip

Label `skip-api-drift` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
