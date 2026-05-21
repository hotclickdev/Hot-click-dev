# Guía de reactivación PayXpert

Archivado: 2026-05-21  
Razón: PayXpert no estaba activo en producción. Se deja PayPal como único pago online mientras se aguarda respuesta del proveedor.

---

## Checklist para reactivar

### 1. Credenciales (Render → Environment)

Agregar estas variables de entorno en el servicio de Render:

```
PAYXPERT_ORIGINATOR_ID=<tu ID de comercio>
PAYXPERT_ORIGINATOR_PASSWORD=<tu contraseña>
```

### 2. application.properties

En `Hot_click_outlet/src/main/resources/application.properties`, reemplazar el bloque actual por:

```properties
# PAYXPERT
payxpert.api.url=https://connect2.payxpert.com
payxpert.originator.id=${PAYXPERT_ORIGINATOR_ID}
payxpert.originator.password=${PAYXPERT_ORIGINATOR_PASSWORD}
payxpert.callback.url=${APP_URL}/api/webhooks/payxpert
payxpert.redirect.success.url=${APP_URL}/pago/exito
payxpert.redirect.cancel.url=${APP_URL}/pago/cancelado
payxpert.payment.ttl.minutes=30
```

Hacer lo mismo en `src/test/resources/application-test.properties` (usar valores de prueba).

### 3. WebhookController.java

Buscar `TODO[PAYXPERT-REACTIVAR]` en `WebhookController.java` y restaurar el handler completo:

```java
@Autowired private PayXpertPaymentProvider payXpertProvider;

@PostMapping("/payxpert")
public ResponseEntity<Map<String, String>> recibirWebhookPayXpert(
        @RequestBody PaymentWebhookDTO dto,
        HttpServletRequest request) {

    String ip = request.getHeader("X-Forwarded-For");
    if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();

    log.info("Webhook PayXpert: order={} errorCode={} status={} ip={}",
        dto.getOrderID(), dto.getErrorCode(), dto.getStatus(), ip);

    try {
        payXpertProvider.procesarWebhook(dto, ip);
        return ResponseEntity.ok(Map.of("status", "OK", "message", "Received"));
    } catch (SecurityException e) {
        log.error("Webhook PayXpert rechazado: {}", e.getMessage());
        return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Security validation failed"));
    } catch (Exception e) {
        log.error("Error procesando webhook PayXpert: {}", e.getMessage(), e);
        return ResponseEntity.ok(Map.of("status", "ERROR", "message", "Internal error"));
    }
}
```

Agregar también el import:
```java
import com.hotclick.payment.PayXpertPaymentProvider;
```

### 4. PaymentService.java y PaymentProviderFactory.java

Buscar `TODO[PAYXPERT-REACTIVAR]` en ambos archivos y cambiar el default de vuelta a `"PAYXPERT"`.

### 5. CheckoutPage.jsx

Buscar `TODO[PAYXPERT-REACTIVAR]` y agregar de vuelta la opción en `METODOS_PAGO`:

```js
{
  id: 'PAYXPERT',
  label: t('checkout.cardLabel'),
  descripcion: t('checkout.cardDesc'),
  badge: null,
  badgeColor: '',
  icon: CardIcon,
},
```

Restaurar también el mensaje de redirecting:
```js
? (metodoPago === 'PAYPAL' ? t('checkout.redirectingPaypal') : t('checkout.redirectingPayxpert'))
```

Y la nota condicional al final del bloque de método de pago:
```jsx
{metodoPago === 'PAYPAL' ? (
  <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
    {t('checkout.paypalNote')}
  </p>
) : (
  <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
    {t('checkout.payxpertNote')}
  </p>
)}
```

### 6. Webhook URL en PayXpert dashboard

Configurar en el panel de PayXpert:
```
https://hot-click-dev.onrender.com/api/webhooks/payxpert
```

### 7. Build y deploy

```bash
cd Hot_click_outlet/frontend && pnpm build
.\maven\bin\mvn clean package -DskipTests
```

---

## Archivos en este directorio

- `payxpert_schema.sql` — DDL original de las tablas de pagos PayXpert (ya aplicado en BD, no ejecutar de nuevo)
- `dsd_ejemplo_endpoints.js` — Ejemplo de referencia de endpoints Express (no es código productivo)

## Búsqueda rápida de TODOs

Buscar todos los puntos de reactivación en el proyecto:
```
grep -r "PAYXPERT-REACTIVAR" Hot_click_outlet/src
grep -r "PAYXPERT-REACTIVAR" Hot_click_outlet/frontend/src
```
