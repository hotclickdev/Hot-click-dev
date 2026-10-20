# Staging efímero en GitHub Actions (decisión: nada de Lightsail)
Workflow: `.github/workflows/staging-api.yml`. Costo USD 0 (repo público, runners estándar).
Corre a mano (workflow_dispatch) o en PR con la etiqueta `qa-api`. Las pruebas de API son tests
automáticos del workflow; QA sigue probando solo desde el navegador (sin excepción).

## Qué necesita del Desarrollador Backend (bloquea que el workflow pase)
Backend lo implementa en su rama `feat/staging-backend` (incluye `application-staging.properties` y el seed).

1. **Perfil `staging`** (`application-staging.properties`): datasource por variables de entorno,
   Flyway contra base vacía (hoy `application-dev` usa baseline 136: confirmar que un esquema vacío
   migra completo), ONVO apagado o simulado (solo sandbox ficticio), sin correo/Telegram/Sentry reales,
   sin Turnstile.
2. **Autenticación de prueba solo en staging** (camino alternativo, amenaza `staging-auth-jwt` en
   `docs/security/amenazas-activas.md`):
   - Filtro que acepta JWT HS256 firmados con `STAGING_JWT_SECRET`, mapeando `email`→usuario y `role`→`ROLE_*`.
   - Se registra **solo si** se cumplen las tres: perfil `staging` activo **Y** `STAGING_AUTH_ENABLED=true`
     **Y** `STAGING_JWT_SECRET` presente (`@Profile("staging")` + condiciones sobre ambas variables).
     Si falta cualquiera, el filtro no existe.
   - **La app NO arranca** si `STAGING_AUTH_ENABLED` o `STAGING_JWT_SECRET` (cualquiera de las dos) existe
     sin el perfil `staging` activo. Eso cubre el perfil default (con el que corre prod) y cualquier `prod`.
   - **Test obligatorio** (Backend): con perfil default y cada una de las variables seteada, el contexto
     falla al arrancar; con `staging` y una de las dos faltando, el filtro no se registra.
   - `STAGING_AUTH_ENABLED` y `STAGING_JWT_SECRET` **nunca** van en el `.env` de prod ni en secrets del repo: el workflow la genera
     en cada corrida (`openssl rand`) y muere con el runner.
3. **Seed** `qa/staging/seed-staging.sql` (en `feat/staging-backend`): completar los INSERT con tablas/columnas reales e IDs fijos
   (usuarios 9001-9003, empresas 9101 activa / 9102 pausada, productos 9201/9202, bodega 9301). IBAN solo `CR00 0000 0000 0000 0000 00`.
4. **Contratos** que usan los tests (`qa/staging/api-tests.sh`), confirmar o corregir:
   - `PATCH /api/productos/{id}/destacado` → 403 no admin, 200 admin (ya tiene `@PreAuthorize ADMIN`).
   - `POST /api/payments/checkout` con contra entrega y envío que no es "normal" → 400. Confirmar valor de `provider` y `metodoEnvio`.
   - `GET /api/tienda/{slug}` de negocio pausado → 404/410/403; activo → 200.
   - Checkout con producto de tienda pausada → 4xx; producto pausado fuera de `/api/productos/destacados`.
5. Cuando todo pase, DevOps quita el filtro de etiqueta para que corra en todos los PR.

## Nunca
Volcados de prod, datos/IBAN reales, secrets del repo, conexión al servidor de prod.

## Nota: Flyway baseline y seed (backend)
- `application-staging.properties` usa `spring.flyway.baseline-on-migrate=true` y `spring.flyway.baseline-version=${STAGING_FLYWAY_BASELINE}` (solo perfil staging; nunca en `application.properties`).
- `STAGING_FLYWAY_BASELINE` fuera del perfil staging hace que la app no arranque (`StagingAuthGuard`).
- El seed `seed-staging.sql` **no se pudo probar** sobre el esquema de baseline: falta `qa/staging/schema-baseline.sql`, que sale del runbook con OK del dueño. Probar el seed cuando exista (V1 no crea las tablas base y V62 requiere pgvector).
