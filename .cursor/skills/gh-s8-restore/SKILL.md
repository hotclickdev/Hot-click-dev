---
name: gh-s8-restore
description: Deja que el ensayo de restore falle en claro si el dump no restaura. Usar cuando S8 falle o abra el issue P0. No restaurar sobre producción.
disable-model-invocation: true
---

# S8 Restore throwaway Postgres

Workflow: `.github/workflows/restore-drill.yml`
Check: `S8 Restore throwaway Postgres`

## Cuándo corre

Los domingos, después del backup. Restaura el último artifact en un Postgres de servicio, nunca en Supabase. Si falla, el segundo job abre un issue P0. Sin artifact, el job falla en claro.

## Qué hacer para que no salga en rojo

1. No uses SUPABASE_* como destino del restore.
2. No tapés el fallo para que el issue P0 no se abra. El segundo job (S8 Issue P0 si el restore falla) existe para eso.
3. Dispatch con use_fixture=true solo prueba el mecanismo con SQL sintético. No cuenta como restore del dump real.
4. No bajes el dump a una máquina de desarrollo con datos de clientes.

## Label de skip

Label `skip-restore-drill` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
