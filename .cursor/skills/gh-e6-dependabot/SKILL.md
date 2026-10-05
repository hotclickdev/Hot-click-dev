---
name: gh-e6-dependabot
description: Clasifica bumps de Dependabot para que E6 no deje pasar un major crítico. Usar en pull requests de dependencias, spring-boot, jjwt o stripe-java.
disable-model-invocation: true
---

# E6 Labels y bloqueo de majors críticos

Workflow: `.github/workflows/dependabot-triage.yml`
Check: `E6 Labels y bloqueo de majors críticos`

## Cuándo corre

Todo pull request a master. Si el autor no es Dependabot, el job pasa en no-op.

## Qué hacer para que no salga en rojo

1. Patch o minor no crítico puede quedar automerge-candidate. Eso no mergea solo: hace falta el label humano safe-to-automerge.
2. Major de spring-boot, jjwt o stripe-java, y cualquier Spring Boot 4, lleva needs-human. No lo mergees automático.
3. No quites needs-human para "desbloquear" el check.

## Label de skip

Label `skip-dependabot-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
