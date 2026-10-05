---
name: gh-e1b-flyway-fresh
description: Comprueba que una migración nueva arranca con perfil dev sobre Postgres vacío para que E1b no falle. Usar al agregar V*.sql, tocar application-dev.properties o FlywayRepairConfig.
disable-model-invocation: true
---

# E1b Boot perfil dev (Postgres 18 vacío)

Workflow: `.github/workflows/gate-flyway-fresh.yml`
Check: `E1b Boot perfil dev (Postgres 18 vacío)`

## Cuándo corre

Pull request o push a master que toca db/migration, db/dev-bootstrap, application-dev.properties, FlywayRepairConfig o docker-compose.dev.yml.

## Qué hacer para que no salga en rojo

1. La base vacía de dev no rejuega V1..V136: Flyway hace baseline y Hibernate arma el esquema. Las migraciones nuevas sí tienen que aplicar al arrancar.
2. No apuntes el perfil dev a RDS ni a Supabase. El guardrail aborta si el host no es localhost, 127.0.0.1 o postgres.
3. Antes del PR, si podés, levantá docker-compose.dev.yml y arrancá con -Dspring-boot.run.profiles=dev para ver que Flyway aplica la migración nueva.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
