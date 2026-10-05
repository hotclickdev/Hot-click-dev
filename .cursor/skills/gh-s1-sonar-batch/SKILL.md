---
name: gh-s1-sonar-batch
description: Lee el lote semanal de Sonar sin abrir un refactor masivo. Usar cuando S1 publique un issue de archivos de más de 200 líneas.
disable-model-invocation: true
---

# S1 Sonar batch (Issue)

Workflow: `.github/workflows/sonar-batch.yml`
Check: `S1 Sonar batch (Issue)`

## Cuándo corre

Los lunes. Lista unos ocho archivos grandes fuera de Payment, Auth, Pos, Sinpe y Wallet. No abre un PR de refactor.

## Qué hacer para que no salga en rojo

1. No hagas un PR que "limpie" los ocho archivos de una vez.
2. Si ya estás tocando uno de esos archivos, aplicá boy scout solo ahí.
3. Sin SONAR_TOKEN el job lista por tamaño y lo dice. No inventes el token.

## Label de skip

Label `skip-sonar-batch` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
