---
name: gh-eng-gates-selftest
description: Corre node --test de scripts/eng-gates antes de cambiar un gate. Usar al editar scripts/eng-gates o .github/workflows de esos checks.
disable-model-invocation: true
---

# node --test scripts/eng-gates

Workflow: `.github/workflows/eng-gates-selftest.yml`
Check: `node --test scripts/eng-gates`

## Cuándo corre

Pull request que toca los scripts o los workflows de los gates.

## Qué hacer para que no salga en rojo

1. node --test scripts/eng-gates/eng-gates.test.mjs
2. Si tocaste una ola concreta, corré también el olaN.test.mjs de esa ola.
3. No cambies el veredicto de un gate para que un PR de producto pase.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
