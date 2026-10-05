---
name: gh-e7-ci-red
description: Lee el comentario E7 de un CI rojo y distingue flake de regresión. Usar cuando el workflow CI — Tests y Build falle y aparezca el comentario de diagnóstico.
disable-model-invocation: true
---

# E7 Diagnóstico CI rojo

Workflow: `.github/workflows/ci-red-diagnose.yml`
Check: `E7 Diagnóstico CI rojo`

## Cuándo corre

Se dispara cuando el workflow CI — Tests y Build termina en failure. Comenta el PR con el job, las últimas líneas y una pista flake vs regresión.

## Qué hacer para que no salga en rojo

1. Abrí el job que E7 nombra (Tests Java o Build React) y corregí esa causa.
2. Si la pista dice flake (falló y pasó en otro run), mirá D6 antes de reintentar a ciegas.
3. No marques el comentario como resuelto sin un commit que arregle el test.

## Label de skip

Label `skip-ci-red` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
