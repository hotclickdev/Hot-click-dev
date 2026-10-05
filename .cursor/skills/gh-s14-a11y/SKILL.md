---
name: gh-s14-a11y
description: Cubre teclado y focus trap del POS cuando S14 marca un hueco. Usar al tocar el POS, un diálogo o el wizard seller.
disable-model-invocation: true
---

# S14 a11y / POS keyboard

Workflow: `.github/workflows/a11y-pos-keyboard.yml`
Check: `S14 a11y / POS keyboard`

## Cuándo corre

Los jueves. Cruza atajos de teclado, axe y useFocusTrap. El smoke de Playwright es opt-in y solo usa specs que ya están en CI.

## Qué hacer para que no salga en rojo

1. Un control clickable es un button, con foco visible. El diálogo del POS usa el focus trap que ya existe.
2. No metas pos-atajos.spec.ts a test:e2e:ci desde este issue: el workflow lo deja afuera para no flakear.
3. No reescribas el POS entero para cerrar el semanal.

## Label de skip

Label `skip-a11y-pos` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
