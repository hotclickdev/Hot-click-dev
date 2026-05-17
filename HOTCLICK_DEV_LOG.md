# HOTCLICK — Dev Log

---

## 2026-05-16 — Sprint: Fix PayPal + UX Garantías + Admin Pagos

### Commit: `f0733b0`

---

### Bug crítico resuelto: PayPal no funcionaba en producción

**Causa 1 — `app.url` no definido**
`PayPalConfig.java` inyectaba `${app.url}` para construir `return_url` y `cancel_url`.
La propiedad no existía en `application.properties` → URLs nulas → PayPal rechazaba la orden.

Fix: `application.properties`
```properties
app.url=${APP_URL:http://localhost:3000}
```
**Acción requerida en Render:** agregar variable `APP_URL=https://hot-click-dev.onrender.com`

**Causa 2 — Webhook PayPal bloqueado por Spring Security**
`SecurityConfig.java` solo permitía `POST /api/webhooks/payxpert`.
El webhook PayPal en `POST /api/webhooks/paypal` requería autenticación → PayPal recibía 401 → nunca confirmaba pagos por webhook.

Fix: `SecurityConfig.java`
```java
.requestMatchers(POST, "/api/webhooks/paypal").permitAll()
```

---

### Backend — nuevos archivos creados

| Archivo | Propósito |
|---------|-----------|
| `AdminPagoController.java` | Endpoints `/admin/pagos`, `/admin/webhooks`, `/admin/pagos/kpis` |
| `PagoResumenDTO.java` | DTO para listado paginado de pagos en admin |
| `WebhookEventResumenDTO.java` | DTO para listado paginado de webhooks en admin |

### Backend — archivos modificados

| Archivo | Cambio |
|---------|--------|
| `application.properties` | Agregar `app.url` |
| `SecurityConfig.java` | Permitir webhook PayPal público |
| `PaymentController.java` | Capturar `correoUsuario` desde SecurityContext en `/paypal/capture` |
| `PayPalPaymentProvider.java` | Manejar `PAYMENT.CAPTURE.DENIED`, links parsing para webhook |
| `PayXpertPaymentProvider.java` | Amount null → SecurityException; FALLIDO/CANCELADO → `marcarFallido()` |
| `PaymentService.java` | `confirmarPedido`, `marcarFallido`, `liberarReservas`, `cancelarExpirados` (scheduler 5 min) |
| `PagoRepository.java` | Query `buscarPagos(proveedor, estadoPago, pageable)` |
| `WebhookEventRepository.java` | Query `buscarWebhooks(procesado, pageable)` |
| `NotificacionEmailService.java` | Agregar `enviarPagoFallido(Pedido, String motivo)` |
| `PayXpertService.java` | Corregir constructor PaymentCheckoutResponse (6 args, agregado proveedor) |

---

### Frontend — nuevos archivos creados

| Archivo | Propósito |
|---------|-----------|
| `pages/admin/AdminPagos.jsx` | Página admin: KPIs + tabla pagos (filtros proveedor/estado) + tabla webhooks |

### Frontend — archivos modificados

| Archivo | Cambio |
|---------|--------|
| `App.jsx` | Ruta `/admin/pagos` + lazy import `AdminPagos` |
| `hooks/usePayment.js` | `iniciarPolling` (3s, 30 intentos, 90s timeout), `stopPolling`, estado `timeout` |
| `pages/PaymentStatusPage.jsx` | UI completa: idle/polling/capturing/success/failed/cancelled/timeout; banner garantía en éxito |
| `layouts/AdminLayout.jsx` | Link "Pagos / Webhooks" con ícono tarjeta en sidebar |
| `components/layout/Navbar.jsx` | Link "Mis pedidos" para usuarios logueados (desktop + mobile) |
| `pages/ProductDetailPage.jsx` | Badge "✓ Garantía 40 días"; grid 2×2 de confianza (🛡🔒💬🚚) |
| `pages/CheckoutPage.jsx` | Franja de confianza antes del botón pagar (garantía · pago seguro · devoluciones) |
| `pages/MisPedidosPage.jsx` | `GarantiaBar`: cuenta regresiva 40 días por pedido en sección expandida |

---

### Decisión de arquitectura: Guest Checkout

**Decisión: mantener cuenta obligatoria.**

Razones:
- `FK_ID_USUARIO_FINAL` en `hot_click_pedido_tb` es NOT NULL → cambio de esquema costoso.
- Garantía de 40 días requiere identificar al comprador para soporte vía WhatsApp.
- Items únicos (`ES_UNICO`) → trazabilidad crítica.
- Volumen bajo → pedidos huérfanos complican soporte.

---

### Flujo de pagos — estado actual (ambos proveedores)

```
Checkout → reservar stock (SELECT FOR UPDATE)
        → crear Pedido PENDIENTE + Pago PENDIENTE (TTL 30 min)
        → redirigir a PayPal / PayXpert

Retorno usuario:
  PayPal  → capturarPayPal() → confirmarPedido() → PAGADO + stock decrementado
  PayXpert → webhook → confirmarPedido() → PAGADO + stock decrementado
  Polling (frontend) → 3s × 30 intentos → si timeout, mostrar pantalla revisión

Fallo:
  marcarFallido() → Pago FALLIDO + Pedido CANCELADO + liberar stockReservado + email aviso

TTL expirado:
  @Scheduled 5 min → cancelarExpirados() → misma cadena de marcarFallido
```

---

### Pendiente (próximo sprint)

- [ ] Sistema de reseñas: tabla `hot_click_resena_tb` + API + moderación admin
- [ ] Sentry: `VITE_SENTRY_DSN` (frontend) + `SENTRY_DSN` (backend) — requiere cuenta externa
- [ ] Índices adicionales: `webhook_event(merchant_token, evento_tipo)`, `pago(estado_pago, fecha_creacion)`
- [ ] Configurar `APP_URL` en Render → requerido para PayPal funcione en producción
