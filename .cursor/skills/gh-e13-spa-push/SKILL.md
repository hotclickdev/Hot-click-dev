---
name: gh-e13-spa-push
description: Tras un push a master, confirma que static/ no quedó detrás de frontend/src. Usar cuando E13 comente el commit avisando que el bundle puede estar viejo.
disable-model-invocation: true
---

# E13 static vs frontend hash

Workflow: `.github/workflows/spa-push-reminder.yml`
Check: `E13 static vs frontend hash`

## Cuándo corre

Push a master en frontend/** o static/**. Comenta el SHA con los tree hashes. No despliega.

## Qué hacer para que no salga en rojo

1. Si el comentario dice que static/ puede estar desactualizado, el arreglo es el de E3: pnpm build y un commit con static/.
2. No fuerces un deploy desde este workflow.
3. E3 cubre el PR, D3 el barrido diario, E13 el push. Los tres tienen que quedar coherentes.

## Label de skip

Label `skip-spa-push` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
