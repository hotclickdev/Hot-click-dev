---
name: gh-e5-playwright
description: Elige el spec Playwright del área tocada para que E5 Playwright area no falle. Usar al cambiar el frontend, specs e2e, checkout, POS o seller.
disable-model-invocation: true
---

# E5 Playwright area

Workflow: `.github/workflows/playwright-area.yml`
Check: `E5 Playwright area`

## Cuándo corre

Pull request que toca frontend/**. Por defecto es dry-run y comentario: no instala browsers.

## Qué hacer para que no salga en rojo

1. Si el diff es de POS, seller o checkout, tiene que existir el spec del área (pos-*, seller-*, checkout-*).
2. No hace falta correr toda la suite e2e en cada PR. El smoke (run_smoke) es opt-in.
3. Si el comentario del check nombra un spec roto, arreglá ese spec o el flujo, no borres la selección.

## Label de skip

Label `skip-playwright-area` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
