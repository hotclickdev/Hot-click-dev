---
name: gh-e18-pgbouncer
description: Prohíbe locks de sesión y LISTEN en migraciones para que E18 PgBouncer V*.sql no falle. Usar al escribir un archivo V*.sql.
disable-model-invocation: true
---

# E18 PgBouncer en V*.sql

Workflow: `.github/workflows/pgbouncer-migration.yml`
Check: `E18 PgBouncer V*.sql`

## Cuándo corre

Pull request que agrega o cambia V*.sql.

## Qué hacer para que no salga en rojo

1. No uses pg_advisory_lock, SET de sesión, LISTEN/NOTIFY ni PREPARE persistente. PgBouncer en transaction mode los suelta.
2. El SQL nuevo lleva IF NOT EXISTS o ADD COLUMN IF NOT EXISTS.
3. UPDATE ... SET y SET NOT NULL no cuentan como session SET. No los reescribas por este check.
4. E2 mira lo mismo en Java. Este check mira el SQL.

## Label de skip

Label `skip-pgbouncer-migration` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
