# Runbook: crear una base nueva con `HOTCLICK_FLYWAY_BASE_VACIA`

Sirve solo para crear una base Postgres **vacía** desde cero (DR, staging nuevo, CI). Prod existente nunca la necesita.

1. Base Postgres nueva, esquema `public` sin tablas.
2. Arrancar la app UNA vez con `HOTCLICK_FLYWAY_BASE_VACIA=true` (propiedad `hotclick.flyway.base-vacia.enabled`).
   Aplica `db/base-vacia` (historial `flyway_base_vacia_history`), baseline V1 y la cadena real V2..VN.
3. Verificar que arrancó sin errores y que `flyway_schema_history` no tiene filas con `success = false`.
4. **Quitar `HOTCLICK_FLYWAY_BASE_VACIA` del entorno** (`.env`, secrets, compose) y reiniciar.
   Si queda puesta con una base que ya tiene tablas no hace nada, pero el arranque deja un WARN
   `[flyway] hotclick.flyway.base-vacia.enabled=true ... quitá la variable del entorno`.

Notas:
- Dos instancias arrancando a la vez sobre la base vacía se serializan con `pg_advisory_lock`
  (`FlywayRepairConfig.BASE_VACIA_LOCK_KEY`): la segunda espera y sigue por el `migrate()` normal.
- Con perfil `dev` y `hotclick.flyway.dev-bootstrap=true` (default) manda el atajo dev; para rejugar la cadena real en dev poner `HOTCLICK_FLYWAY_DEV_BOOTSTRAP=false`.
- Después de crearla, V218 deja el seed admin legado como `admin@hotclick.lat` y fija el `search_path` de `fn_crear_pago` / `fn_obtener_pago_por_token`.
