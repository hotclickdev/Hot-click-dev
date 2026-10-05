---
name: gh-d2-idor-hunter
description: Atiende el issue diario D2 que muestra findById sin chequeo de tenant. Usar cuando el hunter IDOR abra o actualice un issue.
disable-model-invocation: true
---

# D2 IDOR hunter

Workflow: `.github/workflows/hunter-idor.yml`
Check: `D2 IDOR hunter`

## Cuándo corre

Todos los días. Escanea controllers y services. Publica archivo:línea en un issue idor. No imprime secretos.

## Qué hacer para que no salga en rojo

1. Cada findById de un id que viene del cliente necesita el chequeo de tenant del recurso.
2. E2 mira el diff del PR. D2 mira el árbol. Si vas a tocar esa línea, corregí el acceso en el mismo cambio.
3. No borres el issue para silenciar el cron.

## Label de skip

Label `skip-idor-hunter` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
