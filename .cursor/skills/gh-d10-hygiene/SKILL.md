---
name: gh-d10-hygiene
description: Respeta el barrido diario de issues y pull requests de Dependabot. Usar cuando D10 comente un PR major o un issue eng-agent viejo.
disable-model-invocation: true
---

# D10 hygiene

Workflow: `.github/workflows/issues-hygiene.yml`
Check: `D10 hygiene`

## Cuándo corre

Todos los días. Etiqueta PRs de Dependabot y comenta majors sin label de bloqueo. No cierra en masa bugs, outages ni prod-errors.

## Qué hacer para que no salga en rojo

1. Un major de Spring Boot, jjwt o stripe sigue en needs-human. D10 no lo mergea y no le quita el label.
2. Un issue eng-agent stale se comenta antes de cerrarse. No cierres a mano los de outage para "limpiar".
3. E6 corre al abrir el PR. D10 barre los que siguen abiertos.

## Label de skip

Label `skip-issues-hygiene` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
