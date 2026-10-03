# F29.7 — Disaster Recovery Plan
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## Objetivos de recuperación

| Métrica | Objetivo | Justificación |
|--------|---------|--------------|
| **RPO** (Recovery Point Objective) | 24 horas | Pérdida máxima de datos aceptable |
| **RTO** (Recovery Time Objective) | 2 horas | Tiempo máximo para restaurar servicio |
| **MTTR** (Mean Time To Recovery) | < 30 min | Para incidentes de aplicación (no de datos) |

---

## Inventario de activos críticos

| Activo | Ubicación | Backup automático | Criticidad |
|--------|----------|------------------|-----------|
| Base de datos PostgreSQL | Contenedor `hotclick-postgres` en Lightsail | Diario a S3 privado (SSE), retención 30 días. Ver `scripts/backup/RESTORE.md` | CRÍTICO |
| Imágenes, logos, certificados | S3 `hotclick-media` | Versionado del bucket si está activo; no van en el dump de GitHub | ALTO / CRÍTICO (.p12) |
| Código fuente | GitHub | Continuo | CRÍTICO |
| Variables de entorno | `.env` en el host de Lightsail, fuera del repo | Copia en el gestor de secretos del equipo | CRÍTICO |
| Claves API externas | Ese mismo `.env` | Manual | ALTO |

---

## PostgreSQL (Lightsail)

### Backup automático
- Workflow `Daily DB Backup` (06:00 UTC): SSH al host, `docker exec hotclick-postgres pg_dump -Fc`, sube a un bucket S3 privado con SSE.
- El puerto 5432 no está publicado. El dump no se guarda como artifact de GitHub.
- Retención: lifecycle de 30 días en el prefijo `db/`.
- Si el dump pesa menos de 1 KB, el workflow falla, abre el issue D5 y avisa por Telegram.

### Procedimiento de restauración
Ver `scripts/backup/RESTORE.md`. Resumen: bajar el objeto en el host, ensayar en una base `hotclick_restore`, y solo entonces reemplazar la base viva con la app detenida.

```bash
curl -s http://127.0.0.1:8080/api/health
```

### Flyway post-restauración
Las migraciones usan `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` donde aplica.
Si se restaura un dump anterior, Flyway aplica las migraciones que falten al arrancar.

---

## S3 (imágenes y certificados)

### Estado actual
Las imágenes y los `.p12` están en el bucket de medios, no en el dump de Postgres.
El dump de la base no reemplaza una copia de ese bucket.

### Impacto de pérdida del bucket
- **Imágenes de productos**: Los productos siguen funcionando; solo se pierde el display visual. Recuperables de CDN caché o re-upload por emprendedor.
- **Logos**: Mismo impacto que imágenes.
- **Certificados .p12**: **CRÍTICO** — sin certificado, la empresa no puede facturar. El EMPRENDEDOR tiene la copia original del certificado emitido por SINPE/Bansaseguros.

---

## Certificados fiscales PKCS#12

### Procedimiento de recuperación
1. El emprendedor contacta a SINPE o Bansaseguros para re-emitir el certificado (proceso de 1–5 días hábiles)
2. El EMPRENDEDOR sube el nuevo `.p12` en `AdminConfigFiscal → Certificado PKCS#12`
3. La clave ATV debe re-ingresarse (nunca se almacena en texto plano)

**Nota:** La clave ATV (`claveHaciendaEnc`) está cifrada con AES-256-GCM en la BD. Si se pierde la variable de entorno `TOTP_ENCRYPTION_KEY`, el campo es irrecuperable. El EMPRENDEDOR deberá cambiar la clave en el portal ATV y volver a configurarla.

---

## Variables de entorno críticas

Documentar en un gestor de secretos (Vault, Doppler, 1Password Teams):

| Variable | Descripción | Impacto si se pierde |
|---------|------------|---------------------|
| `DB_URL` | Connection string PostgreSQL | App no arranca |
| `JWT_SECRET` | Secreto de firma JWT | Todas las sesiones inválidas |
| `TOTP_ENCRYPTION_KEY` | Clave AES-256 para 2FA y credenciales Hacienda | Pérdida de secrets cifrados |
| `STRIPE_SECRET_KEY` | Clave Stripe | Sin pagos |
| `STRIPE_WEBHOOK_SECRET` | Validación webhooks | Sin confirmación de pagos |
| `ANTHROPIC_API_KEY` | Claude AI | Sin AI Copilot |
| `AWS_S3_BUCKET` + keys IAM de medios | Imágenes y certificados | Sin fotos ni `.p12` en S3 |
| Env de backup en el host (`backup.env`) | Dump diario a S3 | Sin backup nuevo hasta reponerlo |
| `SENDGRID_API_KEY` | Emails | Sin notificaciones |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos | CORS error en producción |

**Procedimiento:** Guardar en Doppler (recomendado) o en un archivo cifrado en un gestor de contraseñas del equipo.

---

## Runbook de incidentes

### Incidente 1: App caída (5xx generalizados)
```
1. `docker logs hotclick` en el host de Lightsail
2. Verificar `curl -s http://127.0.0.1:8080/api/health` y `https://hotclick.lat/api/health`
3. Si startup falla: revisar últimas migraciones Flyway en esos logs
4. Si OOM: `docker stats` (app tope 2 GB, postgres tope 768 MB en el compose)
5. RTO estimado: 10 min
```

### Incidente 2: Base de datos inaccesible
```
1. `docker ps` y el healthcheck de `hotclick-postgres`
2. Si el contenedor está caído: `docker compose -f docker-compose.lightsail.yml up -d postgres` en el directorio del compose
3. Si los datos están corruptos: restaurar desde S3 (`scripts/backup/RESTORE.md`)
4. RTO estimado: 30-60 min
```

### Incidente 3: Pérdida de JWT_SECRET
```
1. Generar nuevo secreto: openssl rand -base64 48
2. Actualizar el `.env` de Lightsail
3. `docker compose -f docker-compose.lightsail.yml restart app` (invalida TODOS los tokens existentes)
4. Notificar a usuarios: "Cerraste sesión por actualización de seguridad. Vuelve a iniciar sesión."
5. RTO estimado: 5 min (todos los usuarios deben re-autenticarse)
```

### Incidente 4: Brecha de seguridad (token comprometido)
```
1. Revocar refresh tokens: DELETE FROM hot_click_refresh_token_tb WHERE usuario_id = ?
2. Si compromiso masivo: rotar JWT_SECRET (invalida TODOS los tokens)
3. Activar 2FA obligatorio para usuarios afectados
4. Auditar hot_click_auditoria_admin_tb para determinar alcance
5. Notificar usuarios afectados vía email
```

---

## Prueba de recuperación (recomendado cada 6 meses)

```
☐ Restaurar backup de BD en entorno de staging
☐ Verificar que Flyway re-aplica migraciones correctamente
☐ Verificar que datos de empresas y pedidos están intactos
☐ Probar login con refresh token post-restauración
☐ Probar checkout en staging
☐ Documentar tiempo de recuperación real vs RTO objetivo
```
