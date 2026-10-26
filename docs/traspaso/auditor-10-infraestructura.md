# Traspaso: Auditor 10 Infraestructura

Rol: auditor de infraestructura de HotClick, en solo lectura (Dockerfile, docker-compose.lightsail.yml, CI, .env y secretos, migraciones, backups, rollback). Solo le reporta a Grok Bot.

En qué quedé: terminé la auditoría de la FASE 1 sobre master aa907776. El informe está en /workspace/hotclick-reportes/auditoria/fase1-infraestructura.md.

Ramas y PRs: ninguno. Este bot no escribe código ni hace push.

Pendientes:
- Que Andrés apruebe la lista de hallazgos para que los bots Dev los implementen.
- INF-01, backup diario en Lightsail: necesita el OK de Andrés porque implica gasto en AWS.

Hallazgos:
- ALTO: INF-01 (sin backup diario), INF-02 (sin vuelta atrás), INF-03 (los fallos de pago y de webhooks de ONVO no avisan a nadie).
- MEDIO: INF-04 (la prueba de restauración no prueba prod), INF-05 (HEALTH_URL vacío hace que se vigile Render), INF-06 (Flyway con Postgres 18 y out-of-order activo).
- BAJO: INF-07 (hibernate.dialect fijado a mano).

Sin verificar: los logs de prod, si existen snapshots de Lightsail y el valor real de las variables HEALTH_URL y SENTRY_DSN.

Decisiones de Andrés que conozco: aprobó la FASE 1 del plan de lanzamiento el 25 de octubre a la 1:35. Prod es solo lectura, no se hace deploy y los merges a master necesitan CI verde más APTO.
