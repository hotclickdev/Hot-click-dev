# Production Hardening

## ProductionConfigValidator

**Archivo:** `config/ProductionConfigValidator.java`

Validador que se ejecuta al inicio de la aplicación (`ApplicationStartedEvent`) para verificar que la configuración de seguridad crítica está correctamente establecida.

### Lógica de detección de entorno

```java
boolean isProduction = appUrl != null
    && appUrl.startsWith("https://")
    && !appUrl.contains("localhost");

// Si APP_URL = "https://hotclick.cr" → isProduction = true
// Si APP_URL = "http://localhost:3000" → isProduction = false (dev)
```

### Checks implementados

| Check | Dev (localhost) | Producción | Acción ante fallo |
|---|---|---|---|
| `JWT_SECRET` vacío | CRITICAL | CRITICAL | Log error (no detiene boot) |
| `JWT_SECRET` < 64 chars | WARNING | CRITICAL | Log nivel correspondiente |
| `TOTP_ENCRYPTION_KEY` vacío | WARNING | CRITICAL | Log nivel correspondiente |
| `TOTP_ENCRYPTION_KEY` ≠ 64 hex chars | CRITICAL | CRITICAL | Log error siempre |
| `CORS_ALLOWED_ORIGINS` contiene `localhost` en prod | — | WARNING | Log warning |

### Output en startup

En producción bien configurada:
```
[SECURITY CONFIG] All critical security settings are properly configured. env=PRODUCTION
```

En producción con problema:
```
[SECURITY CONFIG] CRITICAL: TOTP_ENCRYPTION_KEY is not set — TOTP secrets are stored in plaintext.
[SECURITY CONFIG] CRITICAL: JWT_SECRET is only 32 chars — minimum 64 chars recommended for HS256
[SECURITY CONFIG] 2 critical security misconfiguration(s) detected in PRODUCTION environment.
```

**Por qué no detiene el boot en prod:** Evitar outage en primer deploy cuando aún no están configuradas todas las variables. El operador recibe la alerta en logs y puede configurar antes del primer usuario.

---

## Variables de entorno de seguridad

### Críticas (sin estas el sistema es inseguro)

| Variable | Descripción | Generación |
|---|---|---|
| `JWT_SECRET` | Clave para firmar todos los JWT. Mínimo 64 chars | `openssl rand -base64 64` |
| `TOTP_ENCRYPTION_KEY` | Clave AES-256 para cifrar secretos TOTP. Exactamente 64 hex chars | `openssl rand -hex 32` |
| `DB_URL` | URL de conexión PostgreSQL (Supabase) | Supabase Dashboard |
| `DB_USERNAME` | Usuario de base de datos | Supabase Dashboard |
| `DB_PASSWORD` | Contraseña de base de datos | Supabase Dashboard |
| `SUPABASE_SERVICE_KEY` | Service role key para Supabase Storage | Supabase Dashboard → API |

### Operacionales (afectan funcionalidad pero no seguridad directa)

| Variable | Descripción | Default |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos | `http://localhost:3000` |
| `APP_URL` | URL pública de la app (para return URLs de pagos) | `http://localhost:3000` |
| `SENDGRID_API_KEY` | API key para envío de emails | (ninguno) |
| `PAYPAL_CLIENT_ID` | PayPal integration client ID | (ninguno) |
| `PAYPAL_CLIENT_SECRET` | PayPal integration secret | (ninguno) |
| `PAYPAL_WEBHOOK_ID` | ID del webhook PayPal para verificar firmas | `""` |
| `GOOGLE_VISION_API_KEY` | API Vision para publicaciones automatizadas | (ninguno) |

### Configuración de entorno

```properties
# application.properties — valores de seguridad clave
spring.jpa.hibernate.ddl-auto=none      # NUNCA cambiar a create/update
server.forward-headers-strategy=FRAMEWORK # Necesario detrás del proxy de Render
paypal.ssl.skip-verify=false            # Solo true en dev con sandbox
spring.datasource.hikari.maximum-pool-size=3  # Límite Supabase free tier
```

---

## Checklist de seguridad para deploy en producción

### Antes del primer deploy

- [ ] `JWT_SECRET` generado y configurado en Render (≥ 64 chars)
- [ ] `TOTP_ENCRYPTION_KEY` generado y configurado en Render (exactamente 64 hex chars)
- [ ] `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` de Supabase configurados
- [ ] `SUPABASE_SERVICE_KEY` configurado
- [ ] `CORS_ALLOWED_ORIGINS` apunta solo a dominios de producción (no localhost)
- [ ] `APP_URL` apunta al dominio de producción
- [ ] `SENDGRID_API_KEY` configurado (para emails de 2FA y notificaciones)
- [ ] `PAYPAL_WEBHOOK_ID` configurado (para verificación de webhooks)

### Después del primer deploy

- [ ] Verificar startup logs — buscar `[SECURITY CONFIG]` sin errores CRITICAL
- [ ] Verificar `curl -I https://hotclick.cr/api/health` muestra todos los headers de seguridad
- [ ] Verificar que `/swagger-ui.html` retorna 403 o está deshabilitado
- [ ] Verificar que `/actuator` retorna 403 para requests sin auth ADMIN_IT
- [ ] Hacer login con un usuario de prueba y verificar flujo completo
- [ ] Abrir Security Center con ADMIN_IT y verificar que carga sin errores

### Periódico (mensual)

- [ ] Revisar dependencias con `mvn dependency:check` o Dependabot
- [ ] Revisar alertas activas en Security Center
- [ ] Revisar adopción de 2FA — promover si es baja
- [ ] Rotar `JWT_SECRET` si hay indicios de compromiso
- [ ] Verificar que `PAYPAL_SSL_SKIP_VERIFY` siga en `false`

---

## Rotación de secretos

### JWT_SECRET

La rotación invalida todos los access tokens activos (expirarán en ≤15 min) y todos los refresh tokens (requieren nuevo access token). Los usuarios deberán re-loguearse.

**Procedimiento:**
1. Generar nuevo secret: `openssl rand -base64 64`
2. Actualizar en Render → Environment Variables
3. Trigger redeploy
4. Verificar startup logs

### TOTP_ENCRYPTION_KEY

**CRÍTICO:** Si se rota esta clave, todos los secretos TOTP en DB quedan indescifrable. Los usuarios con 2FA TOTP perderán acceso y deberán re-configurar su 2FA usando recovery codes o soporte.

**Procedimiento de rotación segura (si es necesario):**
1. Script de migración: leer todos los secretos TOTP, descifrar con clave vieja, re-cifrar con clave nueva
2. Actualizar la clave en Render
3. Redeploy con los datos ya migrados

**No rotar TOTP_ENCRYPTION_KEY sin la migración previa.**

---

## ddl-auto=none — Regla crítica

```properties
spring.jpa.hibernate.ddl-auto=none
```

Esta configuración impide que Hibernate modifique el esquema de base de datos automáticamente. **Nunca cambiar este valor.**

Todo cambio de esquema debe hacerse mediante migraciones Flyway:
```
Hot_click_outlet/src/main/resources/db/migration/
  V1__initial_schema.sql
  ...
  V20__security_audit_log.sql   ← última migración
```

Flyway ejecuta las migraciones automáticamente en startup. El `flyway_schema_history` en Supabase registra qué migraciones se han aplicado.

---

## Supabase free tier — limitaciones de seguridad

- **Pool de conexiones:** Máximo 3 conexiones simultáneas (HikariCP configurado a 3)
- **Storage:** Sin virus scanning automático (depende de validación en backend)
- **Row Level Security (RLS):** No está siendo usado (la app maneja autorización en Spring Security). Podría ser una capa adicional.

---

## Logging en producción

```properties
logging.level.root=WARN
logging.level.com.hotclick=INFO
logging.level.org.springframework.web=WARN
logging.level.org.hibernate.SQL=WARN
```

Los eventos de seguridad se logean a nivel `INFO` o `WARN` (siempre visibles).  
Los eventos críticos de SecurityDetectionService se logean a `WARN`.  
Errores de configuración crítica se logean a `ERROR`.

Los logs de Render son el único destino de logging actualmente. Para buscar eventos de seguridad en logs de Render:
```
Buscar: [SEC]     → todos los eventos de security audit
Buscar: [SEC-ALERT] → alertas de ataque
Buscar: [SECURITY CONFIG] → validación de configuración en startup
Buscar: [RATE-LIMIT] → rate limit triggers
```
