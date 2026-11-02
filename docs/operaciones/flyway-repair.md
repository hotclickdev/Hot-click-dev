# Flyway repair: manual, puntual y con OK de Andrés

Desde este cambio, `FlywayRepairConfig` ya **no** llama a `flyway.repair()` en cada arranque.
`repair()` solo corre si:

- el perfil activo es `dev` (base local), o
- `hotclick.flyway.repair-on-start=true` (variable `HOTCLICK_FLYWAY_REPAIR_ON_START`, default `false`).

Sin perfil, con un perfil desconocido o en prod sin el flag, el arranque hace solo `migrate()`.
Con `spring.flyway.validate-on-migrate=true`, un checksum desalineado hace fallar el arranque:
es a propósito, para que alguien lo revise en vez de taparlo.

## Paso previo a cada deploy (solo Andrés o alguien con su OK)

1. Antes de `git pull` / `docker build` en el servidor, revisar `flyway_schema_history` en prod
   (solo lectura):

   ```sql
   SELECT installed_rank, version, description, checksum, success
   FROM flyway_schema_history
   ORDER BY installed_rank DESC
   LIMIT 30;
   SELECT version, description FROM flyway_schema_history WHERE success = false;
   ```

2. Comparar los checksums de las últimas versiones con los del build a desplegar (por ejemplo
   `flyway info`/`flyway validate` por CLI contra prod con un usuario de solo lectura, apuntando a
   `Hot_click_outlet/src/main/resources/db/migration` del commit a desplegar).
3. Si hay filas `success = false` o checksums desalineados: **no desplegar**. Averiguar qué
   migración se editó o falló y decidir con Andrés. No correr repair "para que arranque".

## Repair manual (uso único)

Solo si el paso anterior confirma que el desalineo es benigno (p. ej. se corrigió el script de una
migración FAILED y se volvió idempotente) y Andrés dio el OK.

Opción A: flag de una sola vez

1. Respaldo de la base.
2. Agregar `HOTCLICK_FLYWAY_REPAIR_ON_START=true` al `.env` del servidor.
3. Arrancar una vez y confirmar en logs `[flyway] Ejecutando repair()` y luego el arranque OK.
4. **Quitar** la variable (o ponerla en `false`) y reiniciar. Confirmar en logs
   `[flyway] repair() omitido`.

Opción B: CLI

1. Respaldo de la base.
2. `flyway -url=... -user=... -locations=filesystem:Hot_click_outlet/src/main/resources/db/migration repair`
   (credenciales del `.env`, nunca copiadas a chat ni al repo).
3. `flyway ... validate` y arrancar normal (sin flag).

Dejar constancia (fecha, versión afectada, quién dio el OK) en el registro de operaciones.
