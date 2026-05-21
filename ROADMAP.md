# HOTCLICK — Roadmap técnico

> Fecha: 2026-05-21  
> Arquitectura de referencia para todas las decisiones de priorización.

---

## Arquitectura definida

**Pagos**

| Canal | Estado |
|-------|--------|
| PayPal | Producción — único pago online |
| SINPE | Manual — pendiente implementar flujo de comprobante |
| Efectivo | Offline — pendiente implementar en admin |
| PayXpert | Archivado — ver `archive/payxpert/REACTIVACION.md` |

**Auth**

| Rol | Método |
|-----|--------|
| Cliente | Email + contraseña |
| Admin | Email + contraseña + TOTP 2FA obligatorio |

---

## P0 — Infraestructura crítica (bloquea producción real)

### P0-1: Gestión de secretos

- [ ] Auditar que ningún secreto esté hardcodeado en el código (JWT_SECRET, PAYPAL_*, SENDGRID_KEY, SUPABASE_SERVICE_KEY)
- [ ] Verificar que `PROGRESO.md` no esté en el repo público con credenciales de admin
- [ ] Rotate `JWT_SECRET` si alguna vez estuvo expuesto en git
- [ ] Agregar `.env` y archivos de credenciales a `.gitignore` (verificar)

### P0-2: Backups de base de datos

- [ ] Verificar que Supabase tenga Point-in-Time Recovery (PITR) activado en el plan actual
- [ ] Configurar backup diario exportando el schema + datos críticos a un bucket S3/GCS externo
- [ ] Documentar procedimiento de restore

### P0-3: Migraciones con Flyway

- [ ] Agregar dependencia `flyway-core` a `pom.xml`
- [ ] Cambiar `ddl-auto=none` → `ddl-auto=none` (se mantiene) pero gestionar cambios via `db/migration/V*.sql`
- [ ] Migrar `Actualizado.sql` actual a versiones Flyway numeradas: `V1__schema_inicial.sql`, `V2__pagos.sql`, etc.
- [ ] Configurar `flyway.baseline-on-migrate=true` para la primera ejecución

### P0-4: CI/CD básico

- [ ] Crear `.github/workflows/ci.yml`: compilar Maven + build React + tests en cada PR
- [ ] Bloquear merge a `master` si CI falla
- [ ] Agregar `pnpm build` al pipeline para detectar errores de TypeScript/JSX antes de deployar

---

## P1 — Seguridad y operaciones (semana 1-2)

### P1-1: PayPal hardening

- [ ] Auditar verificación de firma de webhooks PayPal (PAYPAL-TRANSMISSION-SIG)
- [ ] Verificar idempotencia: un mismo `paypalOrderId` no puede confirmar dos pedidos
- [ ] Verificar que el monto del pedido se valida contra el monto capturado por PayPal
- [ ] Confirmar que el modo sandbox → producción esté correctamente controlado por env var
- [ ] Agregar alerta de email/log cuando se detecte un monto incorrecto

### P1-2: Rate limiting en auth

- [ ] Agregar `bucket4j-spring-boot-starter` al `pom.xml`
- [ ] Aplicar límite a `/api/auth/login`: 5 intentos / 1 minuto / IP
- [ ] Aplicar límite a `/api/auth/2fa/verify`: 5 intentos / 5 minutos / IP
- [ ] Aplicar límite a `/api/auth/forgot-password`: 3 solicitudes / 10 minutos / correo

### P1-3: Monitoring básico

- [ ] Activar Spring Boot Actuator (`/actuator/health`) — ya expuesto como `/api/health`
- [ ] Agregar logs estructurados (ya usa MDC con request-id)
- [ ] Configurar alertas en Render cuando el servicio cae o uso de memoria > 80%
- [ ] Agregar log explícito cuando un pago PayPal llega con monto incorrecto

### P1-4: Fixes de seguridad auth (APLICADOS 2026-05-21)

- [x] Verificar `bloqueadoHasta` antes de validar contraseña en login
- [x] Bloquear login de admins sin 2FA configurado
- [x] Contar intentos fallidos en `/api/auth/2fa/verify`

---

## P2 — Funcionalidad SINPE manual (semana 2-3)

### Flujo completo

1. Usuario selecciona SINPE en checkout
2. Frontend muestra número SINPE, nombre receptor, monto y referencia única
3. Usuario sube comprobante (imagen/PDF)
4. Pedido queda en `PENDIENTE_VERIFICACION`
5. Admin aprueba o rechaza desde el panel

### Tareas

- [ ] Nuevo estado de pedido: `PENDIENTE_VERIFICACION` en `Constants.java` y BD
- [ ] `SinpeController.java` — `POST /api/sinpe/comprobante` (upload) + `PUT /api/sinpe/{id}/aprobar` + `PUT /api/sinpe/{id}/rechazar`
- [ ] Tabla `hot_click_comprobante_sinpe_tb` en Supabase + Flyway migration
- [ ] `CheckoutPage.jsx` — opción SINPE con instrucciones + upload de comprobante
- [ ] `AdminOrders.jsx` — sección de SINPE pendientes con vista de comprobante + botones aprobar/rechazar
- [ ] Email de confirmación al aprobar/rechazar

---

## P3 — Reconsiderar PayXpert (sin fecha definida)

- [ ] Contactar PayXpert para obtener credenciales de producción
- [ ] Evaluar si el volumen de ventas justifica la pasarela de tarjeta
- [ ] Considerar alternativas: Stripe Checkout (acepta CR), Wompi, BAC Credomatic
- [ ] Si se reactiva: seguir guía en `archive/payxpert/REACTIVACION.md`

---

## Backlog técnico (sin prioridad de negocio asignada)

- [ ] Paginación server-side real en admin (actualmente carga 200 productos)
- [ ] Búsqueda global en tienda (barra de búsqueda header sin implementar)
- [ ] Efectivo: flujo en admin para registrar pago en mano
- [ ] RLS Supabase: verificar que `rowsecurity=false` en todas las tablas del app
- [ ] Correos CR: etapa 1 — formulario de despacho manual
- [ ] Imagen de perfil de usuario
- [ ] Tests de integración para flujo de pago PayPal end-to-end
