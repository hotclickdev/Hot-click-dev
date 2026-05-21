# HOTCLICK — Roadmap técnico

> Última actualización: 2026-05-21 (sesión 3)
> Score producción actual: **7.2 / 10** — Estado: **GO ✅**

---

## Estado de pagos

| Canal | Estado |
|-------|--------|
| PayPal | Producción — único pago online activo |
| SINPE | Pendiente — flujo de comprobante por implementar |
| Efectivo | Pendiente — registro admin por implementar |
| PayXpert | Archivado — ver `archive/payxpert/REACTIVACION.md` |

## Estado de auth

| Rol | Método |
|-----|--------|
| Cliente | Email + contraseña |
| Admin | Email + contraseña + TOTP 2FA **obligatorio** |

---

## ✅ COMPLETADO

### Infraestructura
- [x] **Flyway** — `flyway-core` + `flyway-database-postgresql` en pom.xml; `V1__initial_schema.sql`; `baseline-on-migrate=true`
- [x] **Backup diario** — `.github/workflows/backup.yml`; `pg_dump` → artifact 30 días; `scripts/restore.sh`
- [x] **spring-boot-starter-cache** — fix de startup crash en Render (cacheManager no encontrado)
- [x] **Logging estructurado** — `logback-spring.xml` + `MdcRequestIdFilter` (request-id en cada log)

### Seguridad Auth (2026-05-21)
- [x] **FIX-1** — `bloqueadoHasta` verificado al inicio del login (brute-force bypass eliminado)
- [x] **FIX-2** — Admin sin 2FA configurado → 403 (2FA ahora obligatorio para `ADMIN_IT`)
- [x] **FIX-3** — Intentos fallidos incrementan en `/2fa/verify` (TOTP protegido contra brute-force)
- [x] `System.err.println` → `log.error` en AuthController

### Seguridad PayPal (2026-05-21)
- [x] **PP-1** — Idempotency key usa `UUID.randomUUID()` (elimina colisión por timestamp)
- [x] **PP-2** — `reference_id` del response validado contra pedido (bloquea order substitution)
- [x] **PP-3** — Monto USD capturado logueado por pedido (audit trail)

### Tests (91/91 PASS)
- [x] Suite de integración: `AuthIntegrationTest`, `SecurityEndpointsTest`, `PedidoAuthorizationTest`
- [x] Suite unitaria: `PaymentServiceTest`, `PedidoServiceTest`, `RefreshTokenServiceTest`, `JwtUtilTest`

---

## 🔴 P0 — Acciones manuales bloqueantes (fuera del código)

Estas no requieren código — solo configuración:

| Acción | Dónde | Urgencia |
|--------|-------|---------|
| Configurar `SUPABASE_BACKUP_URL` en GitHub Secrets | GitHub → Settings → Secrets → Actions | **Crítico** — el backup no corre sin esto |
| Configurar `SUPABASE_DB_PASSWORD` en GitHub Secrets | GitHub → Settings → Secrets → Actions | **Crítico** |
| Verificar `PAYPAL_WEBHOOK_ID` en Render | Render → Environment | **Crítico** |
| Eliminar `Admin1234!` de `PROGRESO.md` | Archivo local | **Alto** |
| Rotar contraseña admin si fue expuesta | Panel admin → cambiar contraseña | **Alto** |

---

## 🟠 P1 — Próximas tareas (orden sugerido)

### P1-1: CI/CD de build y tests

Sin esto, un push roto puede llegar a Render sin que nadie lo note.

- [ ] Crear `.github/workflows/ci.yml`
  ```yaml
  on: [push, pull_request]
  jobs:
    build:
      - mvn clean package -DskipTests -q
      - mvn test
  ```
- [ ] Notificación en GitHub si el CI falla
- [ ] (Opcional) Bloquear merge a `master` si CI falla

**Esfuerzo estimado**: 1-2 horas

---

### P1-2: Rate limiting en auth

Sin esto, un atacante puede hacer brute-force por IP aunque la cuenta esté bloqueada.

- [ ] Agregar `bucket4j-spring-boot-starter` al `pom.xml`
- [ ] `/api/auth/login`: 5 intentos / 1 minuto / IP
- [ ] `/api/auth/2fa/verify`: 5 intentos / 5 minutos / IP
- [ ] `/api/auth/forgot-password`: 3 solicitudes / 10 minutos / correo
- [ ] Respuesta `429 Too Many Requests` con header `Retry-After`

**Esfuerzo estimado**: 2-3 horas

---

### P1-3: SINPE manual (flujo de comprobante)

El método de pago más común en Costa Rica — muchos clientes van a pedirlo.

**Flujo:**
1. Usuario selecciona SINPE en checkout
2. Frontend muestra número SINPE + nombre receptor + monto + referencia única
3. Usuario sube comprobante (foto/PDF)
4. Pedido queda en `PENDIENTE_VERIFICACION`
5. Admin aprueba o rechaza desde el panel
6. Email automático al aprobar/rechazar

**Tareas backend:**
- [ ] Constante `PENDIENTE_VERIFICACION` en `Constants.java`
- [ ] Migración Flyway `V2__sinpe.sql` — tabla `hot_click_comprobante_sinpe_tb`
- [ ] `POST /api/sinpe/comprobante` — upload comprobante a Supabase Storage
- [ ] `PUT /api/sinpe/{id}/aprobar` + `PUT /api/sinpe/{id}/rechazar`
- [ ] Email de notificación al cliente al aprobar/rechazar

**Tareas frontend:**
- [ ] `CheckoutPage.jsx` — opción SINPE con instrucciones y upload
- [ ] `AdminOrders.jsx` — sección SINPE pendientes con vista de comprobante + botones

**Esfuerzo estimado**: 1-2 días

---

### P1-4: Row lock anti-race en captura PayPal

Riesgo bajo (requiere timing muy específico) pero presente.

- [ ] Agregar `SELECT ... FOR UPDATE` en `Pago` antes de procesar captura
- [ ] O usar `@Version` (optimistic lock) en `Pago`
- [ ] Test de concurrencia para verificar que no se duplica el email de confirmación

**Esfuerzo estimado**: 2-3 horas

---

## 🟡 P2 — Funcionalidad adicional

### P2-1: Efectivo — registro admin

- [ ] `PUT /api/pedidos/{id}/pago-efectivo` — admin registra pago recibido
- [ ] UI en `AdminOrders.jsx` — botón "Registrar pago en efectivo"
- [ ] Email de confirmación al cliente

### P2-2: Monitoring básico

- [ ] Alertas en Render cuando el servicio cae (disponible gratis en Render)
- [ ] Log explícito cuando PayPal llega con monto incorrecto
- [ ] Alerta cuando falla el backup de GitHub Actions

### P2-3: Búsqueda global en tienda

- [ ] Barra de búsqueda del header conectada a `GET /api/productos?q=`
- [ ] Backend: `ProductoRepository` con query `LIKE` o PostgreSQL `ILIKE`

### P2-4: Paginación real en admin

- [ ] Admin actualmente carga hasta 200 productos — necesita cursor/page para catálogos grandes
- [ ] `GET /api/productos/admin/todos?page=0&size=50`

---

## 🔵 P3 — Largo plazo

### P3-1: PayXpert (reactivar pasarela de tarjeta)

- [ ] Contactar PayXpert para credenciales de producción
- [ ] Evaluar alternativas: Stripe Checkout (acepta CR), Wompi, BAC Credomatic
- [ ] Si se reactiva: seguir `archive/payxpert/REACTIVACION.md`

### P3-2: Correos CR

- [ ] Etapa 1: formulario manual de despacho (ya documentado en `CORREOS_CR_INTEGRACION.md`)
- [ ] Etapa 2: integración API cuando el volumen lo justifique

### P3-3: Ruleta de premios y referidos

- [ ] Frontend de ruleta conectado al backend
- [ ] Sistema de referidos: controlador + UI (entidades ya existen en BD)

---

## Backlog técnico (sin fecha)

- [ ] Historial de pedidos visible para el usuario final (`/mis-pedidos` ya existe, verificar completitud)
- [ ] Imagen de perfil de usuario (campo en BD, falta flujo de upload)
- [ ] RLS Supabase: verificar `rowsecurity=false` en todas las tablas del app
- [ ] Marcas con logo — `AdminMarcas.jsx` + `MarcaController.java` (estado actual: en progreso)
- [ ] Métodos de pago y envío configurables (tablas en BD, sin entidad JPA)
