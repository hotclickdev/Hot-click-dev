# Auditoría Pagos y Checkout — solo lectura

- **SHA auditado:** `fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736` (master, merge #292, 25-oct-2026 15:27 hora CR)
- **Clon:** `/workspace/hc-pagos-fb9` (nuevo; no se tocó `hc` ni `hc-audit-ro`)
- **Método:** lectura de código + doc oficial ONVO (https://docs.onvopay.com/webhooks.md, https://docs.onvopay.com/payments/sinpe-mobile.md). Sin suites, sin prod, sin cambios.
- **Garantías:** `/workspace/hotclick-reportes/plan-lanzamiento.md` existe (C1 Flujos, C2 Errores no vuelven, C3 Sin cobros de prueba en prod, C4 Datos privados, C5 Roles, C6 Detectar y volver atrás).

Base de links: `B = https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick`

## ALTO

### P-01 · SINPE del marketplace se confirma por comprobante manual + aprobación de admin, no por webhook ONVO (C1, C3)
- **Dónde:** [`service/sinpe/SinpeCheckoutService.java:28,84,94,108`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/sinpe/SinpeCheckoutService.java#L84) (crea pedido `PENDIENTE_COMPROBANTE`, pago `PENDIENTE`); [`controller/SinpeController.java:86,111,182,199`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/controller/SinpeController.java#L182) (subir comprobante, aprobar, rechazar); [`service/sinpe/SinpeComprobanteService.java:110-137`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/sinpe/SinpeComprobanteService.java#L110) (`aprobar` pone `PAGO_CAPTURADO` y llama `confirmarPedido`); [`service/SinpeService.java:20`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/SinpeService.java#L20) ("checkout → subir comprobante → aprobación manual").
- **Riesgo:** viola la regla nueva. Aunque el número mostrado ya es el de ONVO (`onvo.sinpe-destino`, #280), el pago no se asocia a una intención de pago ONVO: el pedido se da por pagado porque un admin mira una imagen. Un comprobante falso o una transferencia que ONVO no asocia (sin intent `processing` con mismo monto/identificación, ONVO la rechaza o queda sin asociar) termina en pedido confirmado sin plata.
- **Reproducir:** checkout SINPE marketplace → `POST /api/sinpe/guest/{n}/comprobante` con cualquier imagen → admin `POST /api/sinpe/admin/comprobantes/{id}/aprobar` → pedido confirmado y stock descontado, sin evento ONVO.
- **Corrección:** crear payment intent ONVO con método `mobileNumber` (o checkout session con SINPE), mostrar número/monto exacto, y confirmar solo con `payment-intent.succeeded` releído por GET (mismo patrón que `PosSinpeOnvoService`). Retirar endpoints de comprobante/aprobar/rechazar (o dejarlos solo como conciliación sin efecto de cobro).
- **Evidencia doc ONVO** (https://docs.onvopay.com/payments/sinpe-mobile.md): "SINPE Móvil permite cobrar un pago cuando el comprador realiza una transferencia al número móvil de ONVO y ONVO la asocia automáticamente con una intención de pago." / "No marques el pago como exitoso en tu sistema hasta recibir `payment-intent.succeeded`."

### P-02 (= C5 previo, VIGENTE) · Carrera aprobar/rechazar comprobante SINPE (C1, C2)
- **Dónde:** [`SinpeComprobanteService.java:111,148`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/sinpe/SinpeComprobanteService.java#L111) usan `findById` sin lock; `ComprobanteSinpe`, `Pago` y `Pedido` sin `@Version` (grep vacío).
- **Riesgo:** dos admins (o doble clic) aprobar+rechazar a la vez: ambos ven `PENDIENTE`; queda pedido confirmado y a la vez cancelado con reservas liberadas (sobreventa) o pago CAPTURADO/CANCELADO inconsistente.
- **Corrección:** `findByIdForUpdate` del comprobante (o `@Version`). Desaparece si se elimina el flujo manual (P-01).

### P-03 (= C8 previo, VIGENTE) · Endpoints SINPE invitado sin rate limit y con enumeración (C4)
- **Dónde:** [`security/RateLimitingFilter.java:97-158`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/security/RateLimitingFilter.java#L116) limita `/api/payments/guest-checkout` pero no `/api/sinpe/guest-checkout` ni `/api/sinpe/guest/*/comprobante` (públicos en [`SecurityAuthorizationRules.java:56-57`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/security/config/SecurityAuthorizationRules.java#L56)). [`SinpeComprobanteService.java:55,57-58`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/sinpe/SinpeComprobanteService.java#L55): 404 "Pedido no encontrado: X" vs 403 distinguen existencia; comparación de correo con `equals` (sensible a mayúsculas).
- **Riesgo:** enumeración de números de pedido y adivinanza de correo; subidas ilimitadas a S3 (costo); un invitado con mayúscula en el correo queda bloqueado.
- **Corrección:** PrefixLimit para `/api/sinpe/guest`; misma respuesta para "no existe"/"no es tuyo"; `equalsIgnoreCase` tras trim (mismo arreglo que A1 de cuentas). Mismo patrón en [`PaymentUserCancellationService.java:30`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/PaymentUserCancellationService.java#L30).

## MEDIO

### P-04 (= C2 previo, PARCIAL) · Llave `onvo_test_` en prod sigue posible por opt-in (C3)
- **Dónde:** [`service/OnvoService.java:81-84`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/OnvoService.java#L81), [`config/OnvoArranqueProdGuard.java:40-49`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/config/OnvoArranqueProdGuard.java#L45), `application.properties:278` (`PAYMENTS_ONVO_PERMITIR_LLAVE_TEST`, default false). Con el opt-in, `modoEsperado()`=`test` ([L99-101](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/OnvoService.java#L99)) y el verificador acepta cobros `mode=test`.
- **Resuelto:** sin opt-in, prod no arranca sin `onvo_live_` y los pagos quedan deshabilitados con llave test (L85-90).
- **Riesgo:** si la variable queda en `true` en prod, una tarjeta de prueba pública confirma pedidos reales. C3 exige "no arranca sin onvo_live_" sin excepciones. **Por confirmar** el valor actual de la variable en prod (no lo leí).
- **Corrección:** eliminar el opt-in en perfil prod (o bloquear checkout de pedidos reales cuando `modoEsperado()=test`).

### P-05 (= C7 previo, VIGENTE) · Locks de stock en el orden del carrito → deadlock (C1)
- **Dónde:** [`service/payment/StockReservationService.java:52-53`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/StockReservationService.java#L52) `findByIdForUpdate` en el orden recibido; no hay ordenamiento por id (grep `sort|Comparator` vacío).
- **Reproducir:** dos checkouts simultáneos con [A,B] y [B,A] → deadlock Postgres, uno falla con 500.
- **Corrección:** ordenar ítems por `productoId` (y agrupar duplicados) antes de bloquear.

### P-06 (= M1 previo, VIGENTE) · Envío sin dirección obligatoria (C1)
- **Dónde:** [`service/payment/CheckoutOrderFactory.java:36-47`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/CheckoutOrderFactory.java#L36) si la dirección es null/vacía simplemente no la guarda; ningún validador la exige (grep sin coincidencias en `CheckoutValidator`/`PaymentCheckoutRequest`).
- **Riesgo:** pedido pagado con envío y sin dónde entregar.
- **Corrección:** si `metodoEnvio` no es retiro, exigir dirección no vacía (400) en el validador.

### P-07 (= C3 previo, PARCIAL) · Bodega 1 fija en pedido manual (C1)
- **Dónde:** [`controller/AdminAsignarController.java:167`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/controller/AdminAsignarController.java#L167) `setBodegaId(1L)`; `frontend/src/pages/admin/ordenes/ordenesHelpers.ts:146` `bodegaId: 1`; [`PedidoManualFactory.java:148-150`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/pedido/PedidoManualFactory.java#L148) sin empresa usa la 1 directamente.
- **Mitigado:** con empresa, `resolverBodega` (L152-158) descarta la 1 si no es del negocio y usa la primera activa.
- **Riesgo restante:** pedidos sin empresa (admin de plataforma) siempre van a la bodega 1, aunque no exista tras un reset (404).
- **Corrección:** pedir bodega explícita en UI/endpoint; quitar el literal.

### P-08 (= C4 previo, VIGENTE) · `BODEGA_DEFAULT_ID` / `EMPRESA_PLATAFORMA_ID` en checkout (C1)
- **Dónde:** [`CheckoutValidator.java:86-97`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/CheckoutValidator.java#L86), [`CheckoutGrupoFactory.java:56`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/CheckoutGrupoFactory.java#L56).
- **Riesgo:** `bodegaId=1` se trata como "no enviado" y se salta la validación de tienda (CMP-4); sin tenant cae a la bodega de plataforma.
- **Corrección:** el front no debe mandar 1; resolver bodega por negocio del producto.

## BAJO

### P-09 · Contador de secret inválido del webhook con carrera (C6)
- [`controller/OnvoWebhookController.java:154-157`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/controller/OnvoWebhookController.java#L154): `getAndSet` + `set(0)` no atómico; el tope de 30/min es aproximado. Impacto bajo (solo afecta a secrets inválidos). Usar un rate limiter existente.

### P-10 · Auto-aprobación SINPE programada sin efecto (C1)
- [`service/SinpeService.java:52-57`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/SinpeService.java#L52) cron diario + ShedLock que solo loguea ([`SinpeAutoApprovalService.java:16-17`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/sinpe/SinpeAutoApprovalService.java#L16)). Código muerto; retirar junto con P-01.

## Pasarela ONVO validada contra la doc (sin hallazgo)
- **Secret del webhook:** header `X-Webhook-Secret`, comparación en tiempo constante ([`OnvoWebhookController.java:66,161-167`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/controller/OnvoWebhookController.java#L161)). Doc: "ONVO incluye ese valor en el header `X-Webhook-Secret`" (https://docs.onvopay.com/webhooks.md). OK.
- **Eventos:** maneja `checkout-session.succeeded`, `payment-intent.succeeded` (POS), `payment-intent.deferred` (solo log), `payment-intent.failed`; responde no-2xx si no verificó para que ONVO reintente. Coincide con la tabla de eventos de la doc. OK.
- **El cuerpo no confirma:** relee sesión e intent por GET ([`OnvoPaymentProvider.java:116-122`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/payment/OnvoPaymentProvider.java#L116)). OK.
- **Céntimos y moneda:** `monto*100` y `CRC` ([`OnvoCobroVerificador.java:80-90`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/service/payment/OnvoCobroVerificador.java#L80)). Doc: "`500000` representa ₡5,000.00 en `CRC`". OK.
- **Modo test/live:** exige `mode` igual al de la llave en sesión e intent (L68-74). OK (ver P-04).
- **Idempotencia:** dedupe por `WebhookEvent(merchantToken, tipo)` + lock de la fila del pago ([`OnvoCapturaService.java:48-62`](https://github.com/hotclickdev/Hot-click-dev/blob/fb9ef78e5fd9b5ba3b3d80dffde6cbb3ce639736/Hot_click_outlet/src/main/java/com/hotclick/payment/OnvoCapturaService.java#L48)). Doc: "Procesá el evento de forma idempotente" y "tolerar eventos recibidos fuera de orden". OK.

## Estado de la auditoría anterior (master 0c29564)
| ID | Estado en fb9ef78e | Línea actual / nota |
|---|---|---|
| C1 comprobantes S3 PUBLIC_READ | **Resuelto** | `SinpeComprobanteService.java:74-75` usa `subirComprobantePrivado`; URL firmada 300 s (L92-107). `PUBLIC_READ` sigue en `StorageUploadHelper.java:138,175,198` pero solo para imágenes públicas, no comprobantes |
| C2 llave test confirma pedidos | **Parcial** | P-04 (opt-in) |
| C3 bodega 1 en pedido manual | **Parcial** | P-07 |
| C4 Constants bodega/empresa | **Vigente** | P-08 |
| C5 carrera aprobar/rechazar | **Vigente** | P-02 |
| C6 captura sin ForUpdate | **Resuelto** | `OnvoCapturaService.java:54` `findByMerchantTokenForUpdate` + recheck L55-57 |
| C7 orden de locks | **Vigente** | P-05 |
| C8 enumeración/rate limit SINPE guest | **Vigente** | P-03 |
| C9 verificador acepta mode/id nulos | **Resuelto** | `OnvoCobroVerificador.java:68-74,104-108` fail-closed |
| C10 GET a ONVO dentro de transacción | **Resuelto** | `OnvoPaymentProvider` sin `@Transactional`; escritura en `REQUIRES_NEW` (`OnvoCapturaService.java:46`) |
| M1 dirección no exigida | **Vigente** | P-06 |
| M-01 oferta no cobrada | **Resuelto** | `OrderPricingService.java:26-33` `precioEfectivo`, usado en `StockReservationService`, `CheckoutPaquetesPlanner`, `CarritoService`, `StorefrontGuestOrderService`, POS. Falta reproducir en staging |

## Por confirmar
- Valor de `PAYMENTS_ONVO_PERMITIR_LLAVE_TEST` y `ONVO_SINPE_DESTINO` en prod (sin acceso, no se leyó).
- Si existe una ruta de checkout session ONVO con SINPE para el marketplace (hay `guardarSinpeRef` en `OnvoPaymentProvider.java:168-173`), lo que daría un camino ya compatible para reemplazar P-01.
