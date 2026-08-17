# Integración PayPal — HOT_CLICK Outlet
> Documento técnico — Sprint 2026-05-17

---

## Resumen

HOTCLICK soporta dos pasarelas de pago en paralelo:

| Pasarela | Estado | Método |
|----------|--------|--------|
| **PayXpert** | ✅ Producción | Tarjeta de crédito/débito |
| **PayPal** | ✅ Producción (sandbox verificado) | Cuenta PayPal o tarjeta vía PayPal |

---

## Arquitectura

```
Usuario → CheckoutPage.jsx
            └─ POST /api/payment/paypal/create-order
                   └─ PayPalPaymentProvider.java
                         └─ PayPal Orders API v2
                               └─ retorna approvalUrl
Usuario → approvalUrl (paypal.com)
            └─ Aprueba o cancela

Aprueba → /pago/exito?paypalOrderId=XXX
            └─ usePayment.js hace polling
                  └─ POST /api/payment/paypal/capture/{orderId}
                         └─ PayPalPaymentProvider.capturar()
                               └─ Pedido marcado PAGADO
                               └─ Email confirmación enviado

Cancela → /pago/cancelado (pantalla amigable con opción de reintentar)
```

---

## Archivos del sistema PayPal

### Backend

| Archivo | Responsabilidad |
|---------|----------------|
| `config/PayPalConfig.java` | Lee credenciales de env vars, construye return/cancel URLs |
| `payment/PayPalPaymentProvider.java` | Lógica completa: OAuth2, crear orden, capturar |
| `service/PaymentService.java` | Orquesta el flujo: delega a PayPalPaymentProvider, guarda Pago en BD |
| `controller/PaymentController.java` | Endpoints REST `/api/payment/paypal/**` |
| `model/Pago.java` | Entidad en `hot_click_pago_tb` |
| `model/TransaccionPago.java` | Log de transacciones en `hot_click_transaccion_pago_tb` |
| `model/PaymentLog.java` | Log raw request/response en `hot_click_payment_log_tb` |

### Frontend

| Archivo | Responsabilidad |
|---------|----------------|
| `hooks/usePayment.js` | Máquina de estados del pago: idle→polling→capturing→success/failed/cancelled |
| `pages/PaymentStatusPage.jsx` | UI de éxito, fallo, cancelación, timeout |
| `pages/CheckoutPage.jsx` | Botón PayPal, trust strip |

---

## Endpoints PayPal

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/payment/paypal/create-order` | Crea orden en PayPal → retorna `approvalUrl` |
| POST | `/api/payment/paypal/capture/{paypalOrderId}` | Captura pago aprobado → marca pedido PAGADO |
| POST | `/api/webhooks/paypal` | Webhook de PayPal (eventos de pago asíncrono) |

---

## Variables de entorno requeridas (Render)

```
PAYPAL_CLIENT_ID=<paypal-sandbox-client-id>
PAYPAL_CLIENT_SECRET=<paypal-sandbox-secret>
PAYPAL_MODE=sandbox                                 (cambiar a "live" en producción)
APP_URL=https://hot-click-dev.onrender.com          (SIN barra al final, SIN salto de línea)
```

> ⚠️ **NUNCA** poner estas credenciales en el código fuente ni en commits.  
> ⚠️ `APP_URL` no debe tener salto de línea al final — esto causó el error `INVALID_REQUEST`.

---

## Flujo detallado

### 1. Crear orden (frontend → backend → PayPal)

```
CheckoutPage.jsx
  → paymentService.createPayPalOrder({ pedidoId })
  → POST /api/payment/paypal/create-order

PaymentController.java
  → paymentService.iniciarPagoPayPal(pedidoId, usuarioId)

PaymentService.java
  → PayPalPaymentProvider.crearSesion(pedido, usuario)

PayPalPaymentProvider.crearSesion():
  1. Obtiene access_token vía OAuth2:
     POST https://api-m.sandbox.paypal.com/v1/oauth2/token
     Authorization: Basic base64(CLIENT_ID:SECRET)
     Body: grant_type=client_credentials

  2. Crea orden:
     POST https://api-m.sandbox.paypal.com/v2/checkout/orders
     Body: {
       intent: "CAPTURE",
       purchase_units: [{ amount: { currency_code: "USD", value: "..." } }],
       payment_source: {
         paypal: {
           experience_context: {
             return_url: APP_URL + "/pago/exito",
             cancel_url: APP_URL + "/pago/cancelado"
           }
         }
       }
     }

  3. Extrae approvalUrl:
     Busca link con rel="payer-action" (NO "approve" — PayPal cambió esto)

  4. Retorna { approvalUrl, paypalOrderId }

Frontend redirige al usuario a approvalUrl (paypal.com/sandbox)
```

### 2. Capturar pago (después de que el usuario aprueba)

```
PaymentStatusPage.jsx detecta ?paypalOrderId=XXX en URL
  → usePayment.js inicia polling del estado

usePayment.js (estado: 'polling')
  → cada 3 segundos llama GET /api/payment/status/{pedidoId}
  → cuando detecta status != PENDIENTE → pasa a 'capturing'
  → POST /api/payment/paypal/capture/{paypalOrderId}

PayPalPaymentProvider.capturar():
  POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{orderId}/capture
  → extrae captureId del response
  → retorna { captureId, status }

PaymentService.java:
  → Actualiza Pago.estado = CAPTURADO
  → Actualiza Pedido.estadoPedido = PAGADO
  → Guarda TransaccionPago con captureId
  → Envía email de confirmación al cliente
```

### 3. Cancelación (usuario cierra PayPal sin pagar)

```
PayPal redirige a APP_URL/pago/cancelado?token=XXX

usePayment.js detecta la URL → intenta capturar
PayPalPaymentProvider.callPayPal() detecta "ORDER_NOT_APPROVED" en la respuesta
  → lanza IllegalStateException("ORDER_NOT_APPROVED")

PaymentService.java re-lanza la excepción (no la envuelve en RuntimeException)
PaymentController.java la atrapa → responde { error: "ORDER_NOT_APPROVED" }

usePayment.js: si el mensaje contiene "ORDER_NOT_APPROVED"
  → setEstado('cancelled')  ← pantalla amigable con botón "Reintentar"
  (antes mostraba pantalla de error genérica — bug corregido)
```

---

## Bugs encontrados y corregidos en este sprint

### Bug 1: `invalid_client` 401 al crear orden

**Síntoma:** `PayPal respondió error: {"error":"invalid_client",...}`

**Causa:** Las credenciales de sandbox estaban revocadas en PayPal Developer Dashboard.

**Solución:**
1. Ir a [developer.paypal.com](https://developer.paypal.com) → Apps & Credentials → Sandbox
2. Crear nueva app o regenerar secret
3. Actualizar `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` en Render

**No requirió cambios de código.**

---

### Bug 2: `INVALID_REQUEST` — salto de línea en URLs

**Síntoma:** PayPal rechazaba la orden con `INVALID_REQUEST` indicando URLs inválidas.

**Causa:** `APP_URL` en Render tenía un `\n` al final → la URL resultante era:
```
https://hot-click-dev.onrender.com\n/pago/exito
```

**Solución — `PayPalConfig.java`:**
```java
public String getReturnUrl() { return appUrl.trim() + "/pago/exito"; }
public String getCancelUrl() { return appUrl.trim() + "/pago/cancelado"; }
```

---

### Bug 3: `PayPal no devolvió URL de aprobación`

**Síntoma:** El backend no encontraba el link de aprobación en la respuesta de PayPal.

**Causa:** PayPal Orders API v2 con `payment_source.paypal` retorna el link con `rel="payer-action"`,
no `rel="approve"` como con el flujo clásico.

**Solución — `PayPalPaymentProvider.crearSesion()`:**
```java
// Antes:
.filter(l -> "approve".equals(l.get("rel")))

// Después:
.filter(l -> "approve".equals(l.get("rel")) || "payer-action".equals(l.get("rel")))
```

---

### Bug 4: Error `jsonb` en Hibernate 6 — tres entidades afectadas

**Síntoma:**
```
PSQLException: ERROR: column "request_body" is of type jsonb but expression is of type character varying
```

**Causa:** Hibernate 6 no mapea automáticamente `String` → columna `jsonb` de PostgreSQL.

**Solución — agregar `@JdbcTypeCode(SqlTypes.JSON)` en los tres modelos:**

```java
// PaymentLog.java, TransaccionPago.java, WebhookEvent.java
@JdbcTypeCode(SqlTypes.JSON)
@Column(name = "request_body", columnDefinition = "jsonb")
private String requestBody;
```

Entidades afectadas:
- `PaymentLog` → `request_body`, `response_body`
- `TransaccionPago` → `payload_respuesta`
- `WebhookEvent` → `payload_raw`

---

### Bug 5: FK constraint violation al guardar `Pago`

**Síntoma:**
```
ERROR: insert or update on table "hot_click_pago_tb" violates foreign key constraint
"hot_click_pago_tb_fk_id_pedido_fkey"
DETAIL: Key (fk_id_pedido)=(...) is not present in table "HOT_CLICK_PEDIDO_TB"
```

**Causa:** El esquema original (SQL con comillas dobles) creó la tabla como `"HOT_CLICK_PEDIDO_TB"`
(case-sensitive en PostgreSQL). El FK de `hot_click_pago_tb` apuntaba a esa tabla.
Hibernate guarda en `hot_click_pedido_tb` (minúsculas) — **son tablas distintas en PostgreSQL**.

**Solución — SQL ejecutado en Supabase SQL Editor:**
```sql
-- Eliminar FK incorrecto (apuntaba a tabla uppercase)
ALTER TABLE "hot_click_pago_tb"
  DROP CONSTRAINT IF EXISTS "hot_click_pago_tb_fk_id_pedido_fkey";

-- Eliminar FK duplicado (quedó de intento anterior)
ALTER TABLE "hot_click_pago_tb"
  DROP CONSTRAINT IF EXISTS "hot_click_pago_tb_fk_id_pedido_fkey1";

-- Crear FK correcto apuntando a tabla lowercase
ALTER TABLE "hot_click_pago_tb"
  ADD CONSTRAINT "hot_click_pago_tb_fk_id_pedido_fkey"
  FOREIGN KEY ("fk_id_pedido") REFERENCES "hot_click_pedido_tb" ("id_pedido");
```

> ⚠️ PostgreSQL con `CREATE TABLE "NOMBRE"` (comillas dobles) crea la tabla con ese nombre
> exacto, sensible a mayúsculas. Sin comillas usa minúsculas por defecto.

---

### Bug 6: `ORDER_NOT_APPROVED` mostraba pantalla de error genérica

**Síntoma:** Usuario que cerraba la ventana de PayPal sin pagar veía "Pago no completado" 
en rojo, sin opción clara de reintentar.

**Solución:**

Backend (`PayPalPaymentProvider.java`):
```java
if (responseBody.contains("ORDER_NOT_APPROVED")) {
    throw new IllegalStateException("ORDER_NOT_APPROVED");
}
```

Backend (`PaymentService.java`) — re-lanzar sin envolver:
```java
try {
    payPalProvider.capturar(paypalOrderId, pago);
} catch (IllegalStateException e) {
    throw e;  // ← no envolver en RuntimeException
} catch (Exception e) {
    throw new RuntimeException("Error capturando pago PayPal: " + e.getMessage(), e);
}
```

Frontend (`usePayment.js`):
```js
if (typeof msg === 'string' && msg.includes('ORDER_NOT_APPROVED')) {
    setEstado('cancelled')   // pantalla amigable con botón "Reintentar"
} else {
    setError(msg)
    setEstado('failed')
}
```

---

## Cuentas de sandbox para pruebas

| Cuenta | Propósito | Cómo obtener |
|--------|-----------|--------------|
| **Business** (vendedor) | Recibe el pago | developer.paypal.com → Sandbox → Accounts → tipo Business |
| **Personal** (comprador) | Hace el pago | developer.paypal.com → Sandbox → Accounts → tipo Personal |

> ⚠️ La cuenta Personal de sandbox es diferente a la cuenta del desarrollador.  
> Al llegar a paypal.com/sandbox, usar las credenciales de la cuenta **Personal** (comprador).

---

## Configuración en producción (checklist)

```
[ ] PAYPAL_CLIENT_ID → credenciales de cuenta Live (no Sandbox)
[ ] PAYPAL_CLIENT_SECRET → credenciales de cuenta Live
[ ] PAYPAL_MODE=live
[ ] APP_URL=https://hot-click-dev.onrender.com (sin salto de línea, sin / al final)
[ ] Webhook configurado en PayPal Developer → Live → Webhooks:
      URL: https://hot-click-dev.onrender.com/api/webhooks/paypal
      Eventos: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED
[ ] SecurityConfig.java ya permite POST /api/webhooks/paypal sin autenticación ✅
```

---

## Notas de seguridad

- Las credenciales de PayPal **nunca** deben aparecer en código fuente ni en commits.
- Siempre ir a Render → Environment → agregar/editar variables de entorno.
- Si una credencial se compromete, revocarla en developer.paypal.com y generar una nueva.
- El webhook de PayPal no requiere token porque PayPal llama desde sus propios servidores.

---

## Moneda

PayPal opera en **USD**. HOTCLICK maneja precios en **CRC (₡ colones)**.  
`PayPalPaymentProvider` convierte: `totalCRC / 500` para obtener USD aproximado.

> Pendiente (sprint futuro): integrar una API de tipo de cambio real (BCR o BCCR)
> para una conversión precisa al momento del pago.
