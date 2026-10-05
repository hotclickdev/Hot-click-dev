---
name: gh-ola3-selftest
description: Corre el selftest de la ola 3 de eng-gates. Usar al modificar scripts/eng-gates de esa ola o su workflow.
disable-model-invocation: true
---

# node --test ola 3

Workflow: `.github/workflows/ola3-selftest.yml`
Check: `node --test ola 3`

## Cuándo corre

Pull request que toca los archivos de la ola 3.

## Qué hacer para que no salga en rojo

1. node --test scripts/eng-gates/ola3.test.mjs
2. El doc de la ola está en docs/AGENTES_OLA3.md. No reimplementes un check que ya existe en otra ola.
3. Si el test falla, arreglá el script. No borres el caso para dejar el workflow verde.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
