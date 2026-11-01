# Flyway base-vacia: prerrequisitos y tablas JPA

Complementa el runbook de base-vacia (`docs/operaciones/flyway-base-vacia.md`). Va en un archivo
aparte para no chocar con el PR #486, que crea ese runbook.

## Prerrequisito: extensión `vector` (V62)

V62 ejecuta `CREATE EXTENSION IF NOT EXISTS vector`. Con un rol de aplicación sin superusuario la
cadena falla a mitad de camino con `permission denied to create extension "vector"`.

Antes del primer arranque con `HOTCLICK_FLYWAY_BASE_VACIA=true`, un superusuario corre en esa base:

```sql
CREATE EXTENSION vector;
```

(pgvector tiene que estar instalado en el servidor; en Supabase viene disponible.)
`FlywayRepairConfig.verificarExtensionVector` lo comprueba antes de tocar el esquema: si la
extensión falta y el rol no es superusuario, el arranque corta con un mensaje que dice exactamente
qué correr. El camino prod (base con tablas) no ejecuta esa verificación.

## Tablas JPA en minúsculas

Prod obtuvo `hot_click_carrito_item_tb`, `hot_click_estado_tb`, `hot_click_giro_ruleta_tb`,
`hot_click_premio_tb`, `hot_click_referido_tb` y `hot_click_resultado_ruleta_tb` de Hibernate
(`ddl-auto=update`) antes del baseline V1; V1 solo trae las versiones `"HOT_CLICK_*_TB"` y V2+ no las
crea. `db/base-vacia/V1__esquema_base_vacia.sql` ahora las crea con el DDL de Hibernate (PK identity,
UNIQUE, 10 FKs con los nombres de Hibernate, `idx_giro_usuario_jpa`) y copia los estados 1-5 desde
`"HOT_CLICK_ESTADO_TB"`.

`FlywayBaseVaciaJpaValidatePostgresTest` (Testcontainers pgvector pg17, corre en CI) arranca el
contexto con `ddl-auto=validate` sobre una base construida por base-vacia.

## Efecto en staging

Staging se construyó con la versión anterior de base-vacia: no tiene esas 6 tablas en minúsculas.
`flyway_base_vacia_history` ya está aplicado, así que el cambio **no** se aplica solo: hace falta
reconstruir la base de staging (esquema vacío + `CREATE EXTENSION vector` + arranque con
`HOTCLICK_FLYWAY_BASE_VACIA=true`). Prod no cambia: no usa base-vacia y ningún checksum de
`db/migration` se modificó.
