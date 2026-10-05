---
name: gh-ci-auto-merge
description: Deja pasar el auto-merge de hotfix solo cuando CI y E14 están verdes. Usar al preparar una rama hotfix/ que deba mergearse sola.
disable-model-invocation: true
---

# Auto-merge si CI pasa (hotfix)

Workflow: `.github/workflows/ci.yml`
Check: `Auto-merge si CI pasa (hotfix)`

## Cuándo corre

Job de ci.yml. Corre solo si la rama es hotfix/** y Tests Java, Build React y E14 pasaron. Hace squash merge y avisa por Telegram.

## Qué hacer para que no salga en rojo

1. No pidas auto-merge en una rama que no sea hotfix/.
2. Para que este job llegue a correr, Tests Java, Build React y E14 tienen que estar verdes. Arreglá esos, no este job.
3. No fuerces el merge si E14 sacó el label. Falta el issue de outage o gitleaks falló.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
