---
name: gh-d1-flyway-drift
description: Atiende el issue diario D1 de drift entre entidades JPA y migraciones Flyway. Usar cuando aparezca el issue schema-drift.
disable-model-invocation: true
---

# D1 schema-drift

Workflow: `.github/workflows/flyway-jpa-drift.yml`
Check: `D1 schema-drift`

## Cuándo corre

Todos los días. Compara anotaciones JPA en com.hotclick.model con V*.sql y Actualizado.sql. Abre un issue. No ejecuta SQL.

## Qué hacer para que no salga en rojo

1. Si el issue nombra una columna, el arreglo es el de E1: migración nueva + Actualizado.sql. No ejecutes el SQL sugerido contra producción.
2. Este cron no reemplaza el gate del PR. Si estás en un PR, cumplí E1 antes de mergear.
3. No marques el issue como resuelto sin la migración.

## Label de skip

Label `skip-flyway-drift` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
