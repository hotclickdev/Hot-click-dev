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
| Base de datos PostgreSQL | Supabase | ✅ Diario (Supabase Point-in-Time Recovery) | CRÍTICO |
| Imágenes de productos | Supabase Storage (bucket HOT_CLICK) | ❌ Manual | ALTO |
| Logos de empresas | Supabase Storage (bucket HOT_CLICK) | ❌ Manual | ALTO |
| Certificados fiscales (.p12) | Supabase Storage (path `certificados/`) | ❌ Manual | CRÍTICO |
| Código fuente | Git (GitHub/GitLab) | ✅ Continuo | CRÍTICO |
| Variables de entorno | Render Dashboard | ❌ Manual (documentar) | CRÍTICO |
| Configuración Stripe | Stripe Dashboard | ✅ Stripe gestiona | ALTO |
| Claves API externas | Variables de entorno | ❌ Manual (documentar) | ALTO |

---

## PostgreSQL (Supabase)

### Backup automático
- **Plan Free**: Backup diario, retención 7 días (Point-in-Time Recovery no disponible)
- **Plan Pro**: PITR con retención 7 días, restauración a cualquier segundo
- **Recomendación**: Usar Plan Pro para producción — PITR es crítico para recuperar de errores accidentales

### Procedimiento de restauración
```bash
# 1. Desde Supabase Dashboard → Database → Backups
# 2. Seleccionar backup de la fecha/hora deseada
# 3. Clic en "Restore" (crea una nueva instancia)
# 4. Actualizar DB_URL en Render con la nueva connection string
# 5. Reiniciar el Web Service en Render

# Validar restauración:
curl https://hotclick-app.onrender.com/api/health
# Verificar migraciones Flyway:
# GET /api/health debe retornar 200 con flyway.status = success
```

### Flyway post-restauración
Las migraciones V1–V49 son idempotentes (usan `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
Si se restaura a una versión anterior, Flyway re-aplica las migraciones faltantes en startup.

---

## Supabase Storage (imágenes y certificados)

### Estado actual
❌ **No existe backup automático del Storage en el plan Free.**

### Procedimiento de backup manual (recomendado mensualmente)
```bash
# Usar la Supabase CLI o la API REST del bucket
# Opción 1: Supabase CLI
supabase storage download --project-ref <ref> HOT_CLICK ./backup-storage-$(date +%Y%m%d)/

# Opción 2: Script via API REST
curl -H "Authorization: Bearer <SERVICE_KEY>" \
  "https://<PROJECT>.supabase.co/storage/v1/bucket/HOT_CLICK/objects" \
  | jq '.[].name' | while read f; do
    curl -H "Authorization: Bearer <SERVICE_KEY>" \
      -o "./backup-storage/$f" \
      "https://<PROJECT>.supabase.co/storage/v1/object/HOT_CLICK/$f"
  done
```

### Impacto de pérdida de Storage
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
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | Storage y DB | Sin imágenes ni storage |
| `SENDGRID_API_KEY` | Emails | Sin notificaciones |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos | CORS error en producción |

**Procedimiento:** Guardar en Doppler (recomendado) o en un archivo cifrado en un gestor de contraseñas del equipo.

---

## Runbook de incidentes

### Incidente 1: App caída (5xx generalizados)
```
1. Verificar logs en Render Dashboard → Web Service → Logs
2. Verificar conectividad BD: curl /api/health
3. Si startup falla: revisar últimas migraciones Flyway en logs
4. Si OOM: escalar RAM en Render (Starter → Standard)
5. RTO estimado: 10 min
```

### Incidente 2: Base de datos inaccesible
```
1. Verificar estado de Supabase en status.supabase.com
2. Si outage de Supabase: esperar (SLA 99.9% = max 8.7h/año de downtime)
3. Si corrupción propia: restaurar desde backup vía Dashboard
4. RTO estimado: 30-60 min
```

### Incidente 3: Pérdida de JWT_SECRET
```
1. Generar nuevo secreto: openssl rand -base64 48
2. Actualizar en Render Environment Variables
3. Reiniciar Web Service (invalida TODOS los tokens existentes)
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
