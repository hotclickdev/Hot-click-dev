---
name: gh-e2-tenant
description: Revisa findById, TenantContext y PgBouncer en el diff Java para que E2 Tenant / IDOR / PgBouncer no falle. Usar al tocar controllers, services o repositories.
disable-model-invocation: true
---

# E2 Tenant / IDOR / PgBouncer

Workflow: `.github/workflows/gate-tenant.yml`
Check: `E2 Tenant / IDOR / PgBouncer`

## Cuándo corre

Pull request que toca controller, service o repository Java.

## Qué hacer para que no salga en rojo

1. Un id de cliente que llega por URL pasa por CompanyScope.assertCanAccess (o el chequeo de tenant que ya usa ese recurso). findById suelto en un endpoint es IDOR.
2. No uses pg_advisory_lock, SET de sesión, LISTEN/NOTIFY ni set_config para aislar tenant. Con PgBouncer en transaction mode se pierden.
3. @Async y threads nuevos no heredan TenantContext: pasá el tenant de forma explícita.
4. El gate comenta el PR con las líneas. Corregí el riesgo alto; no lo tapes con el label.

## Label de skip

Label `skip-tenant-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
