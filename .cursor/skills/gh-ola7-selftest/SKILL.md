---
name: gh-ola7-selftest
description: Corre el selftest de la ola 7 de eng-gates. Usar al modificar scripts/eng-gates de esa ola o su workflow.
disable-model-invocation: true
---

# node --test ola 7

Workflow: `.github/workflows/ola7-selftest.yml`
Check: `node --test ola 7`

## Cuándo corre

Pull request que toca los archivos de la ola 7.

## Qué hacer para que no salga en rojo

1. node --test scripts/eng-gates/ola7.test.mjs
2. El doc de la ola está en docs/AGENTES_OLA7.md. No reimplementes un check que ya existe en otra ola.
3. Si el test falla, arreglá el script. No borres el caso para dejar el workflow verde.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
