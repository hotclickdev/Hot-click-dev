---
name: gh-e14-hotfix
description: Exige issue de outage y gitleaks verde en ramas hotfix para que E14 Hotfix extra check no quite el auto-merge. Usar al abrir un pull request hotfix/.
disable-model-invocation: true
---

# E14 Hotfix extra check

Workflow: `.github/workflows/hotfix-gate.yml`
Check: `E14 Hotfix extra check`

## Cuándo corre

Hay dos jobs con el mismo nombre: hotfix-gate.yml y un job dentro de ci.yml. En un PR normal el de ci.yml es PASS no-op. En hotfix/** exige issue outage o prod-errors y gitleaks verde.

## Qué hacer para que no salga en rojo

1. La rama se llama hotfix/algo.
2. El cuerpo del PR enlaza un Issue con label outage o prod-errors, o el PR trae ese label.
3. gitleaks del rango base..head tiene que pasar. No metas secretos en el hotfix.
4. Si falta el issue o gitleaks, el job saca safe-to-automerge y automerge-candidate. No los vuelvas a poner a mano para forzar el merge.

## Label de skip

Label `skip-hotfix-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
