---
name: gh-e1-flyway
description: Exige migración Flyway junto a un cambio de esquema JPA para que E1 Flyway vs entidades JPA no falle. Usar al modificar entidades, V*.sql o Actualizado.sql, antes de commit o pull request.
disable-model-invocation: true
---

# E1 Flyway vs entidades JPA

Workflow: `.github/workflows/gate-flyway.yml`
Check: `E1 Flyway vs entidades JPA`

## Cuándo corre

Pull request a master que toca model/entity, db/migration o Actualizado.sql.

## Qué hacer para que no salga en rojo

1. Si el diff cambia @Column, @Table o @JoinColumn, agregá V{N}__descripcion.sql (N mayor que la última migración) con IF NOT EXISTS.
2. Replicá el SQL al final de Hot_click_outlet/Actualizado.sql.
3. No apliques ese SQL a producción desde el agente. El gate solo mira el diff.
4. Probá en local con perfil dev y Postgres de docker-compose.dev.yml.

## Label de skip

Label `skip-flyway-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
