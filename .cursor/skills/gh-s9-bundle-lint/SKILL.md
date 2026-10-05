---
name: gh-s9-bundle-lint
description: Mantiene lint:ci y el tamaño de los chunks cuando S9 abre un issue. Usar al agrandar el bundle o al tocar el allowlist de eslint.
disable-model-invocation: true
---

# S9 bundle / lint:ci

Workflow: `.github/workflows/bundle-lint-ci.yml`
Check: `S9 bundle / lint:ci`

## Cuándo corre

Los lunes. Corre pnpm lint:ci (allowlist chico), no eslint sobre todo el repo. Mide los JS de static/assets.

## Qué hacer para que no salga en rojo

1. No actives eslint en todo el frontend para "ganar" el semanal.
2. Un chunk sobre el umbral se parte o se deja de importar en el layout. No subas el umbral sin motivo.
3. El build que commiteás en E3 es el que este job mide. Un static/ viejo ensucia el número.

## Label de skip

Label `skip-bundle-lint` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
