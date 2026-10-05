---
name: gh-ci-build-react
description: Deja Vitest, el e2e de CI y pnpm build en verde para que el check Build React no falle. Usar al cambiar el frontend antes de un pull request.
disable-model-invocation: true
---

# Build React

Workflow: `.github/workflows/ci.yml`
Check: `Build React`

## Cuándo corre

Push y pull request a master. Instala con pnpm frozen, corre pnpm test, Playwright test:e2e:ci y pnpm build.

## Qué hacer para que no salga en rojo

1. pnpm test en Hot_click_outlet/frontend tiene que pasar.
2. Si tocaste un flujo e2e, corré el spec. El job de CI corre pnpm test:e2e:ci, no solo el dry-run de E5.
3. pnpm build tiene que terminar. Este job no compara static/: eso es E3. Igual commiteá static/ si cambió frontend/src.
4. No subas node_modules ni results.json.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
