---
name: gh-e3-static
description: Reconstruye y commitea static/ cuando cambia frontend/src para que el check E3 Artefactos static/ vs frontend/src no salga en rojo. Usar al editar el frontend, antes de commit o pull request, o cuando GitHub marque E3, gate SPA o pnpm build.
disable-model-invocation: true
---

# E3 Artefactos static/ vs frontend/src

Workflow: `.github/workflows/gate-spa.yml`
Check: `E3 Artefactos static/ vs frontend/src`

## Cuándo corre

Pull request a master que toca Hot_click_outlet/frontend/src/** o src/main/resources/static/. Si cambió el fuente y static/ no viene en el PR, CI corre pnpm build y falla si el resultado difiere. Docker no compila React: producción sirve esa carpeta.

## Qué hacer para que no salga en rojo

1. En el mismo commit que el cambio de frontend/src, desde Hot_click_outlet/frontend, construí con las mismas variables que el workflow (si no, el bundle no coincide con CI):

   - VITE_SENTRY_DSN vacío
   - VITE_APP_RELEASE=ci-spa-gate
   - VITE_POSTHOG_PROJECT_TOKEN vacío
   - VITE_POSTHOG_HOST=https://us.i.posthog.com
   - VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
   - VITE_STRIPE_PUBLIC_KEY=pk_test_placeholder
   - pnpm build

2. Incluí Hot_click_outlet/src/main/resources/static/ en ese commit.
3. No des por bueno el check E4: evaluateSpa marca "ok" aunque todavía falte el build. La X roja la pone este job, al comparar el árbol.
4. Un commit ya mergeado no se pone verde. El arreglo es un commit nuevo con static/ al día.

## Label de skip

Label `skip-spa-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
