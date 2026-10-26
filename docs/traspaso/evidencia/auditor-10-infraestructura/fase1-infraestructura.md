# Fase 1 — Auditoría de Infraestructura (Auditor 10)
- Commit auditado: master `aa907776d3ee` (2026-10-25 01:28 hora CR, UTC-6), worktree de solo lectura `/tmp/a10`. Sin cambios en código, AWS ni prod.
- Prod solo se consultó con GET públicos (01:36 hora CR): `GET https://hotclick.lat` → 200; `GET /api/health` → `{"status":"UP","version":"1.1"}`; `GET /actuator/health` → 401.
- Rutas relativas a `Hot_click_outlet/` salvo las que empiezan con `.github/` o `scripts/`.

## RESUMEN: qué bloquea a los primeros clientes (C6)
1. **Sin backup diario de la base viva.** `backup.yml` hace pg_dump de **Supabase**; prod es Postgres 18 dentro de Docker en Lightsail, sin puerto publicado. Si se pierde el disco o el volumen, se pierden pedidos y pagos. (C6, ALTO)
2. **Sin vuelta atrás.** La imagen de la app no tiene versión (`hot_click_outlet-app`, se compila en el host), no hay workflow de deploy ni de rollback y Flyway no tiene "undo". No hay una forma probada de volver a la versión anterior. (C6, ALTO)
3. **Sin alerta de fallos de pago ni de webhooks ONVO.** Los errores se registran solo con `log.error/warn`, Sentry no recibe logs (no está sentry-logback) y el 500 del webhook se devuelve desde un catch, así que no llega al resolver de Sentry. Un secreto de webhook mal configurado (todo da 401) pasa sin que nadie se entere. (C6, ALTO)
4. El drill de restauración prueba Supabase→PG16, no Lightsail PG18; y el pager de salud cae por defecto en Render. Son MEDIO, pero sin arreglarlos C6 no se puede demostrar.

---
## CORRECCIONES

### INF-01 · ALTO · C6 backup diario — El backup diario apunta a Supabase, no a la DB de prod
- **Archivo:línea:** `.github/workflows/backup.yml:17-22` (`SUPABASE_DB_PASSWORD`, `SUPABASE_BACKUP_URL`, `pg_dump "$SUPABASE_BACKUP_URL"`); `docker-compose.lightsail.yml:1,8-18` (prod = `postgres:18-alpine` en contenedor, volumen `hotclick_pgdata`, **sin `ports:`**).
- **Reproducir:** leer los dos archivos. El servicio `postgres` no publica puertos, así que un runner de GitHub no puede llegar a la DB de Lightsail. No hay timer ni cron en el repo que haga el dump en el host (`rg -i "pg_dump" scripts .github`: solo aparece Supabase). `scripts/restore.sh:7-9` también documenta solo Supabase.
- **Evidencia:** citas de arriba; `/workspace/propuesta-backup-lightsail.md` §0 (Seguridad, 22-oct) llega a la misma conclusión. **No verificado:** si existen snapshots automáticos de Lightsail. Hay que confirmarlo en la consola, y eso lo hace Andrés.
- **Arreglo:** script en el host `pg_dump -Fc` vía `docker exec hotclick-postgres` + systemd timer diario. Cifrado y subida fuera de la cuenta y región (S3 de otra cuenta, o R2/B2), con retención de 30 días, más alerta Telegram si falla o pesa menos de N KB. Además, activar snapshots automáticos de Lightsail como complemento. Reapuntar `backup.yml` y `verify-backup.sh` para que verifiquen el último objeto del bucket en vez de hacer dump. Necesita OK de Andrés (AWS/gasto).

### INF-02 · ALTO · C6 vuelta atrás — No hay punto de retorno de la app ni deploy reproducible
- **Archivo:línea:** `docker-compose.lightsail.yml:32-33` (`build: .` + `image: hot_click_outlet-app`, sin tag); `Dockerfile:1-4` (el front tiene que estar precompilado y commiteado; si no, se sirve un bundle viejo); `.github/workflows/` no tiene ningún workflow que despliegue a Lightsail (`rg -il lightsail .github/workflows` → vacío). Lo único "deploy" es `ci.yml:140-160` (auto-merge de `hotfix/*`, que avisa "Fix deployado automáticamente" pero no despliega).
- **Reproducir:** en el host, cada `docker compose up --build` pisa `hot_click_outlet-app:latest`, así que la imagen anterior queda sin nombre y no hay un comando para volver a ella.
- **Evidencia:** las líneas citadas. Además, `spring.flyway.out-of-order=true` (`src/main/resources/application.properties:62`) y Flyway Community no tiene undo: una migración aplicada no se revierte al bajar la versión de la app.
- **Arreglo:** construir la imagen en CI con tag `sha` (GHCR) y que el compose use `image: ghcr.io/...:${APP_TAG}`. Un `deploy.sh` que guarde el tag anterior y haga `pg_dump` previo (punto de retorno de datos), y un `rollback.sh` que vuelva al tag anterior. Regla: migraciones solo aditivas (expand/contract) para que la versión N-1 funcione con el esquema N. Probarlo en staging y guardar la evidencia (C6 lo exige).

### INF-03 · ALTO · C6 alertas de pago/webhook — Fallos de pago y de webhook ONVO no generan alerta
- **Archivo:línea:** `src/main/java/com/hotclick/controller/OnvoWebhookController.java:75-76` (secreto inválido → solo `log.warn` + 401); `:115-123` (`payment-intent.failed` → solo registro); `:126-128` (excepción atrapada → `log.error` + 500; no se relanza, así que el `sentry.exception-resolver-order` no la ve); `:142-146` (404/409/503 sin alerta). `payment/OnvoPaymentProvider.java:183,187` (`log.warn`). `pom.xml:250-254`: solo `sentry-spring-boot-starter-jakarta`, sin `sentry-logback`. `src/main/resources/logback-spring.xml`: sin appender de Sentry.
- **Reproducir (staging):** poner un `ONVO_WEBHOOK_SECRET` distinto al de ONVO y hacer una compra con tarjeta de prueba. El webhook responde 401, el pedido queda pendiente y no llega nada a Sentry ni a Telegram. Lo mismo pasa con un 500 forzado (por ejemplo, DB caída durante el webhook).
- **Evidencia:** las líneas citadas. El único flujo Telegram de alertas es `sentry/SentryAlertPolicy.java` (depende de que el evento llegue a Sentry) y los pagers de `/api/health` (que no miran pagos).
- **Arreglo:** (a) agregar `io.sentry:sentry-logback` (misma versión 7.14.0) y `sentry.logging.minimum-event-level=error`. (b) En el catch de `:126` y en los casos 401/503/409, `Sentry.captureMessage/Exception` con tag `onvo_webhook=<resultado>`, sin PII. (c) Un contador/umbral: ≥3 401 o 5xx de webhook ONVO en 10 min → Telegram. ≥N `payment-intent.failed` por hora o tasa de rechazo anómala → Telegram. (d) Un job que alerte si hay pedidos ONVO en pendiente más de 30 min (webhook perdido). Cada punto con prueba automática.

### INF-04 · MEDIO · C6 vuelta atrás probada — El drill de restauración no prueba prod
- **Archivo:línea:** `.github/workflows/restore-drill.yml:90` (`postgres:16-alpine`) contra prod 18 (`docker-compose.lightsail.yml:9`); obtiene el dump de `backup.yml` (Supabase), ver INF-01.
- **Reproducir:** leer los archivos. Un dump `-Fc` de pg_dump 18 no se restaura con pg_restore 16, y el dump plano puede traer sintaxis 18.
- **Arreglo:** cambiar la imagen del drill a `postgres:18-alpine` e instalar `postgresql-client-18` (PGDG). Que el drill descargue el dump cifrado del bucket de INF-01 y corra los conteos de `scripts/restore.sh` (usuario/pedido/producto). Mantener la issue P0 si falla.

### INF-05 · MEDIO · C6 monitoreo — Los pagers de salud tienen como fallback Render, no hotclick.lat
- **Archivo:línea:** `.github/workflows/health-pager.yml:188-190` y `real-health.yml:241-243` (`HEALTH_URL` vacío → `https://hot-click-dev.onrender.com/api/health`).
- **Reproducir:** si el secreto `HEALTH_URL` no existe o está vacío, se monitorea Render (host viejo), así que una caída de Lightsail no pagina. **No verificado:** el valor del secreto (no se puede leer).
- **Arreglo:** cambiar el fallback a `https://hotclick.lat/api/health` y hacer que el job falle si la URL apunta a `onrender.com`. Confirmar que el secreto `HEALTH_URL` es hotclick.lat.

### INF-06 · MEDIO · Arranque prod — Flyway 11.7.2 no reconoce PostgreSQL 18 y además tiene outOfOrder activo
- **Archivo:línea:** `pom.xml:13-16` (Spring Boot 3.5.16 → `flyway.version` 11.7.2, según el BOM `spring-boot-dependencies-3.5.16.pom` en ~/.m2); `pom.xml:175-182` (flyway-core + flyway-database-postgresql sin versión propia); `docker-compose.lightsail.yml:9` (`postgres:18-alpine`); `application.properties:58-62` (`baseline-on-migrate=true`, `baseline-version=1`, `out-of-order=true`).
- **Reproducir:** arrancar con PG18 da el aviso "PostgreSQL 18 is newer than this version of Flyway and support has not been tested" (el aviso lo reportó Grok Bot desde los logs de prod; no lo vi yo en los logs). Con `out-of-order=true`, una migración con número menor que la última aplicada (por ejemplo, ramas viejas que se mergean tarde, como `V171_1__otp_reset_datos.sql`) se aplica en silencio en prod, en un orden que nunca se probó.
- **Evidencia:** las líneas citadas. Hay 171 migraciones y la última es `V187__empresa_cuenta_onvo.sql`.
- **Arreglo:** (a) fijar `<flyway.version>` a una 11.x que declare soporte de PG18 (verificar en las release notes de Flyway antes de subir) y correr `gate-flyway-fresh.yml` (ya usa PG18). (b) `spring.flyway.out-of-order=false` en prod (dejarlo solo en un perfil dev si hace falta) más un gate de CI que rechace una `V<n>` menor que la máxima de master. (c) Quitar `baseline-on-migrate=true` en prod: la DB ya tiene historial, y en una DB vacía por error marcaría V1 como aplicada.

### INF-07 · BAJO · Arranque prod — `hibernate.dialect` explícito (aviso HHH90000025)
- **Archivo:línea:** `src/main/resources/application.properties:69` (`spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect`).
- **Reproducir:** al arrancar, Hibernate 6 avisa que no hace falta fijar el dialecto (se detecta solo). Fijarlo impide que detecte las capacidades de PG18.
- **Arreglo:** borrar la línea; verificar el arranque y la suite de repositorios en staging con PG18.

### INF-08 · BAJO · C6/C4 — La imagen de la app no tiene healthcheck y el JVM no tiene límites coherentes con el contenedor
- **Archivo:línea:** `docker-compose.lightsail.yml:31-54` (sin `healthcheck` en `app`; `-Xmx1536m` con `mem_limit: 2g` y Chromium en la imagen, `Dockerfile:24`).
- **Reproducir:** si la app se cuelga sin morir, `restart: unless-stopped` no la reinicia. Una importación de catálogo con Chromium más un heap lleno puede llevar a un OOM-kill del contenedor.
- **Arreglo:** `healthcheck` con `wget -qO- localhost:8080/api/health`, más autoheal o alerta. Usar `-XX:MaxRAMPercentage=70` en vez de un Xmx fijo, o subir `mem_limit`.

---
## MEJORAS

| # | Mejora | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| M1 | Runbook de vuelta atrás de 1 página | Alto (C6) | Bajo | `docs/runbook-rollback.md` (nuevo) | Pasos: backup previo → deploy por tag → smoke → rollback por tag; restaurar el dump; quién decide. Ejecutarlo una vez en staging y adjuntar el log. |
| M2 | Smoke post-deploy | Alto | Bajo | `scripts/smoke.sh` (nuevo) | `/api/health`, la portada y un GET de catálogo; si falla, rollback automático al tag anterior. |
| M3 | Panel de pagos para admin | Medio | Medio | `AdminPagoController.java` | Endpoint de solo lectura con conteos de las últimas 24 h: cobros OK/fallidos, webhooks 4xx/5xx y pedidos pendientes de más de 30 min. Sirve como evidencia de C6. |
| M4 | Gate de versión de Postgres coherente | Medio | Bajo | `.github/workflows/*.yml` | Un check que falle si algún workflow usa una imagen `postgres:` distinta a la de `docker-compose.lightsail.yml`. |
| M5 | Pin de imágenes por digest | Medio | Bajo | `Dockerfile:6,19`, `docker-compose.lightsail.yml:9` | Fijar `@sha256:` y dejar que Dependabot (docker) las actualice. Evita que un `postgres:18-alpine` cambie de minor sin aviso. |
| M6 | Build del front dentro del Dockerfile | Medio | Medio | `Dockerfile:1-4` | Etapa Node (pnpm build) en el multi-stage. Elimina el riesgo de servir un bundle viejo si alguien olvida compilar. |
| M7 | Disco y certificados en el pager | Medio | Bajo | `scripts/eng-gates/real-health.mjs` | Alertar cuando falten menos de 14 días para que venza el TLS de hotclick.lat y, si se expone una métrica, cuando el disco pase del 80%. |
| M8 | Limpiar config de hosts muertos | Bajo | Bajo | `render.yaml`, `railway.toml`, `docker-compose.prod.yml`, comentarios Supabase en `application.properties:56-57` | Marcar como obsoletos o borrarlos para que nadie despliegue o haga backup del host equivocado. |

## Fuera de alcance / no verificado
- Contenido real de `.env` en Lightsail, secretos de GitHub (`HEALTH_URL`, `SENTRY_DSN`) y existencia de snapshots de Lightsail: requieren acceso que este auditor no tiene, y no se tocaron.
- Los avisos de arranque se tomaron de lo que informó Grok Bot; no se leyeron los logs de prod.
