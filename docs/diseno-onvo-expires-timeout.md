# Diseño: expiración de checkout session y timeout HTTP propio para ONVO

Estado: diseño. No se implementa hasta fusionar el #240, porque los puntos de enganche
(`OnvoService`, `PaymentExpirationCleanupService`) están modificados en ese PR.
Base: `origin/master` eb7564c. #240 head: d306958.

## 1. Situación actual (master)

| Tema | Dónde | Hoy |
|---|---|---|
| Creación de sesión | `OnvoService.crearCheckoutSession` (L103-135) | `POST /checkout/sessions/one-time-link` con `lineItems`, `redirectUrl`, `cancelUrl`, `metadata`, `customerEmail`. No manda expiración. |
| TTL del pago | `PaymentExpirationCleanupService` L49 | `ahora.minusMinutes(30)` está hardcodeado y el scheduler corre cada 5 minutos (`@Scheduled(fixedRate = 5*60*1000)`, L38). |
| HTTP | `WebConfig.restTemplate()` (L21-27) | Es el RestTemplate compartido con Hacienda, PostHog y otros: connect 10 s, read 30 s. ONVO no tiene un timeout propio. |
| Resilience4j | `application.properties` L334-338 y L370-374 | CB `onvo`: ventana de 5 llamadas, 60 % de fallos, 30 s abierto, ignora `IllegalStateException`. Retry `onvo`: 3 intentos con backoff de 1 s ×2, solo ante `ResourceAccessException` y `HttpServerErrorException`. |
| Fallbacks | `OnvoService` L312-340 | Todos relanzan (`relanzarFalloOnvo`) y ninguno inventa un éxito. Así ya fallan cerrados. |

## 2. `expires_at` al crear la sesión: verificación contra la API de ONVO

Verifiqué el 2026-10-22 contra la OpenAPI pública de ONVO (https://docs.onvopay.com/openapi.yaml):
- `CreateOneTimeLink`, el request de `POST /v1/checkout/sessions/one-time-link`, solo tiene estas propiedades: `customerName`, `customerEmail`, `customerPhone`, `redirectUrl`, `cancelUrl`, `officeId`, `onBehalfOf`, `captureMethod`, `paymentMethodTypes`, `discounts`, `discountCouponIds` y `lineItems`. **No tiene `expiresAt` ni `expires_at`.**
- El schema de respuesta `CheckoutSession` tampoco expone `expiresAt`. Sí tiene `status`, con los valores `open`, `complete` y `expired`.
- La guía "Enlaces de un solo uso" (https://docs.onvopay.com/checkout/one-time-links) no menciona ninguna expiración configurable.
- Sí existe `POST /v1/checkout/sessions/{id}/expire` (https://docs.onvopay.com/api/expirar-una-sesion-de-checkout), y el #240 ya lo usa con `OnvoService.expirarCheckoutSession`.
- No pude verificar cuánto dura por defecto una sesión en ONVO, porque no está documentado.

**Decisión.** No se manda `expiresAt`, porque mandar un campo no documentado podría dar un 400 o ignorarse sin aviso. El TTL se aplica de nuestro lado:
1. Un solo TTL configurable, `onvo.http.sesion-ttl` (por defecto `PT30M`, sobreescribible por env `ONVO_SESION_TTL`), reemplaza el `minusMinutes(30)`.
2. Al vencer el TTL, el cleanup expira la sesión en ONVO (ya en el #240, `expirarSesionSinCobro`) antes de cancelar. Así la URL deja de ser pagable.
3. Si ONVO llega a documentar `expiresAt`, se agrega en `crearCheckoutSession` como `ahora + sesionTtl` en ISO-8601 UTC, detrás de una propiedad `onvo.http.enviar-expires-at=false`. Esto queda pendiente y no se asume.

## 3. RestTemplate y timeout propios para ONVO

- Un bean nuevo `@Bean @Qualifier("onvoRestTemplate")`, con `connectTimeout` y `readTimeout` tomados de `OnvoHttpProperties` (`onvo.http.connect-timeout`, por defecto `PT5S`, y `onvo.http.read-timeout`, por defecto `PT15S`). Se configuran por env y no hay nada hardcodeado en el código de servicio.
- `OnvoService(RestTemplate)` pasa a recibir `@Qualifier("onvoRestTemplate")`. Es un cambio de una línea en el constructor, después del #240.
- El RestTemplate compartido de `WebConfig` no se toca, para no cambiar los tiempos de Hacienda ni de PostHog.
- La clase preparada es `Hot_click_outlet/src/main/java/com/hotclick/config/onvo/OnvoHttpProperties.java`. Es un record con valores por defecto y validación de que sean positivos. **No está conectada**: no se registra con `@EnableConfigurationProperties` y no hay bean ni propiedades en `application.properties`.

## 4. Fail-closed ante timeout

Un timeout da `ResourceAccessException` (que envuelve `SocketTimeoutException`) y quiere decir que el resultado es **desconocido**. Se aplican estas reglas:
- **Lecturas** (`obtenerCheckoutSession` y `obtenerPaymentIntent`): un timeout se relanza y nunca devuelve `Map.of()`. En el #240, `leer` solo convierte el 404 en vacío, y lo demás se relanza. Hay que mantenerlo así.
- **Verificación** (`OnvoPaymentProvider.procesarPagoVerificado` y webhook): un timeout no confirma el pago. El `Pago` queda `PENDIENTE` y el pedido nunca pasa a pagado.
- **Cleanup** (`onvoPermiteCancelar`): el `catch (Exception)` devuelve `false`, que significa no cancelar, y se reintenta en la siguiente vuelta. No se cancela un pago que quizá sí se cobró. Esto ya pasa en master y en el #240.
- **Expirar** (`expirarCheckoutSession`): ante un timeout se relanza y no se cancela el pedido, porque no se confirmó que la sesión expiró.
- **Crear sesión**: un timeout de lectura en el POST puede haber creado una sesión en ONVO. Se lanza el error al comprador sin crear el `Pago` local. Una sesión huérfana no puede marcar nada pagado, porque la confirmación exige un `Pago` local con el mismo monto (`OnvoCobroVerificador`).

## 5. Interacción con Resilience4j

- **Retry:** cada intento consume un `readTimeout`. En el peor caso son 3×15 s + 1 s + 2 s ≈ 48 s, frente a ≈ 93 s hoy con read 30 s. Sigue siendo alto para una petición web.
  - Propuesta: `resilience4j.retry.instances.onvo.max-attempts` configurable y bajar a 2 en lecturas.
  - **No reintentar el POST de creación ante un `ResourceAccessException`**, porque no es idempotente y ONVO no documenta una llave de idempotencia (la búsqueda de "idempot" en la OpenAPI y en `llms-full.txt` solo da recomendaciones genéricas). Se hace con una instancia `onvo-escritura` con `retry-exceptions=HttpServerErrorException` solamente, o sin `@Retry` en `crearCheckoutSession`, `crearPaymentIntent`, `confirmarPaymentIntent` y `expirarCheckoutSession`.
- **Circuit breaker:** los timeouts cuentan como fallo, y está bien que el circuito se abra. Con el circuito abierto, los fallbacks relanzan (`relanzarFalloOnvo`) y nadie interpreta eso como pagado. Se mantiene `ignore-exceptions=IllegalStateException`, que son los errores de negocio y 4xx traducidos.
- Opcional: `slow-call-duration-threshold` del CB `onvo` alineado con `readTimeout` (por ejemplo `PT10S`) para abrir el circuito antes ante degradación.
- **TimeLimiter:** no se usa, porque solo aplica a llamadas asíncronas. Basta con el timeout del socket.

## 6. Puntos exactos de enganche después de fusionar el #240

| Archivo (estado #240) | Cambio |
|---|---|
| `service/OnvoService.java`, constructor `OnvoService(RestTemplate)` (L51 en master) | `@Qualifier("onvoRestTemplate")` |
| `service/OnvoService.java`, `crearCheckoutSession` (L103-104) | Quitar `@Retry(name="onvo")` o cambiarlo a `onvo-escritura`. **No** agregar `expiresAt` (ver §2). |
| `service/OnvoService.java`, `expirarCheckoutSession` (nuevo en #240, solo `@CircuitBreaker`) | Dejarlo sin retry ante timeout, como está. |
| `service/OnvoService.java`, `leer` (#240) | Sin cambio. Confirmar con un test que un timeout se relanza. |
| `service/payment/PaymentExpirationCleanupService.java` L49 | `ahora.minus(onvoHttpProperties.sesionTtl())` en lugar de `minusMinutes(30)`. Inyectar `OnvoHttpProperties`. |
| `service/payment/PaymentExpirationCleanupService.java`, `onvoPermiteCancelar` (switch del #240) | Sin cambio de lógica: el `catch` ya devuelve `false`. |
| `config/` (nuevo) `OnvoHttpConfig` | `@EnableConfigurationProperties(OnvoHttpProperties.class)` y el bean `onvoRestTemplate`. |
| `application.properties` (cerca de L251-256) | `onvo.http.connect-timeout=${ONVO_CONNECT_TIMEOUT:PT5S}`, `onvo.http.read-timeout=${ONVO_READ_TIMEOUT:PT15S}`, `onvo.http.sesion-ttl=${ONVO_SESION_TTL:PT30M}` y la instancia `onvo-escritura`. |

Verificado: el corte de L49 aplica a **todos** los proveedores salvo SINPE (`PagoRepository.findExpiradosPendientesByEmpresa`, L52-54: `p.proveedor IS NULL OR p.proveedor <> 'SINPE'`). Por eso conviene una propiedad genérica `pagos.ttl-pendiente` (por defecto `PT30M`) para el corte, y que `onvo.http.sesion-ttl` la tome como valor por defecto. Así no cambia el TTL de Tilopay ni de Stripe sin que nadie lo decida.

## 7. Tests previstos

1. `OnvoHttpPropertiesTest`: valores por defecto, rechazo de valores cero o negativos (vuelven al valor por defecto), y binding desde propiedades.
2. `OnvoRestTemplateTimeoutTest`: un servidor local (MockWebServer o `HttpServer` del JDK) que tarda más que el `readTimeout` produce `ResourceAccessException`, en menos de `readTimeout` + margen.
3. `OnvoServiceTimeoutTest`:
   - Un timeout en `obtenerCheckoutSession` u `obtenerPaymentIntent` se relanza y no devuelve vacío.
   - Un timeout en `crearCheckoutSession` no se reintenta (`verify(times(1))`).
   - Un timeout en `expirarCheckoutSession` se relanza.
4. `OnvoPagoTimeoutFailClosedTest`: un webhook o verificación con timeout deja el `Pago` en `PENDIENTE` y el pedido no queda pagado. Se agrega a `NingunCaminoPagaGratisTest` del #240.
5. `PaymentExpirationCleanupOnvoTest` (#240):
   - Con TTL configurado (por ejemplo `PT10M`), el corte usa ese valor y no 30.
   - Un timeout en la reconsulta no cancela.
   - Un timeout al expirar no cancela.
6. Circuito abierto: el fallback relanza y no confirma nada.

## 8. Riesgos

- La duración por defecto de la sesión en ONVO es desconocida. Si es menor que el TTL, el comprador ve el link vencido antes. Si es mayor, la sesión queda abierta hasta que el cleanup la expire, con una ventana de hasta TTL + 5 minutos.
- Bajar el `readTimeout` a 15 s puede cortar respuestas lentas pero válidas de ONVO. El valor es configurable y se ajusta con métricas.
- Si alguna vez ONVO documenta `expiresAt` y también lo aplica, hay que coordinar los dos relojes (el de ONVO en UTC y el corte local en `Constants.ZONA_CR`).
