---
name: gh-d6-flake
description: Distingue un test flake de una regresión cuando D6 abre un issue. Usar cuando un spec falló al menos dos veces y pasó en otro run.
disable-model-invocation: true
---

# D6 flake hunter

Workflow: `.github/workflows/flake-hunter.yml`
Check: `D6 flake hunter`

## Cuándo corre

Todos los días. Lee runs de ci.yml. Un spec que falló dos veces o más y pasó en otro run entra al issue flake.

## Qué hacer para que no salga en rojo

1. No reintentes el PR en círculo si el issue ya marcó el spec como flake. Estabilizá el test.
2. E7 comenta un CI rojo puntual. D6 junta los que van y vienen.
3. Solo usa GITHUB_TOKEN. No hace falta otro secreto.

## Label de skip

Label `skip-flake-hunter` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
