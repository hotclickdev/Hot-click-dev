---
name: gh-e10-authz
description: Registra cada ruta /api nueva en SecurityAuthorizationRules para que E10 Authz catch-all no falle. Usar al crear un controller o un endpoint.
disable-model-invocation: true
---

# E10 Authz catch-all

Workflow: `.github/workflows/gate-authz.yml`
Check: `E10 Authz catch-all`

## Cuándo corre

Pull request a master. Falla si hay un mapping /api nuevo que solo caería en el catch-all /api/**.

## Qué hacer para que no salga en rojo

1. Cada path nuevo va con requestMatchers explícito en SecurityAuthorizationRules (público, autenticado o rol).
2. No borres el catch-all ni SecurityAuthorizationRulesCatchAllTest.
3. El comentario del check nombra el path que falta. Agregá esa regla y el test si el patrón del archivo lo pide.

## Label de skip

Label `skip-authz-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
