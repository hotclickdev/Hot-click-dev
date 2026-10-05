---
name: gh-d3-spa-stale
description: Reconstruye static/ cuando el issue diario D3 dice que el bundle está viejo. Usar cuando aparezca el issue spa-stale.
disable-model-invocation: true
---

# D3 spa-stale

Workflow: `.github/workflows/spa-stale.yml`
Check: `D3 spa-stale`

## Cuándo corre

Todos los días. Compara la fecha de commit de frontend/src con la de static/. Si el fuente es más nuevo, abre issue spa-stale. No hace pnpm build él mismo.

## Qué hacer para que no salga en rojo

1. El arreglo es el de E3: pnpm build con las variables del workflow y un commit que toque static/.
2. D3 queda en paz cuando el commit de static/ es igual o posterior al último commit que tocó frontend/src.
3. No cierres el issue sin ese commit. Docker sigue sirviendo el JS viejo.

## Label de skip

Label `skip-spa-stale` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
