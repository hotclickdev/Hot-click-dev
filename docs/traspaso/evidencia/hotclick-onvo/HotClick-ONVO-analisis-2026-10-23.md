# HotClick — Análisis de aplicabilidad de ONVO (23-oct-2026)

Fuentes (descargadas en `/workspace/onvo-docs/`): `llms-full.txt`, `llms.txt`, `openapi.yaml` de https://docs.onvopay.com. Base de la API: `https://api.onvopay.com`. Código de HotClick leído solo en modo lectura: `/workspace/hc-pagos2-planes/Hot_click_outlet/src/main`. Si la documentación no dice algo, aparece como **no documentado**.

## 1. Qué ofrece ONVO

| Capacidad | Endpoints | Doc |
|---|---|---|
| Autenticación | Bearer con llave secreta o publicable; prefijos `onvo_test_` y `onvo_live_`; la llave define el modo | https://docs.onvopay.com/authentication |
| Intenciones de pago | `POST/GET /v1/payment-intents`, `GET/POST /{id}`, `/{id}/confirm`, `/{id}/capture`, `/{id}/cancel`, `GET /v1/payment-intents/account` | https://docs.onvopay.com/payments/payment-intents |
| Autorización y captura por separado | `/{id}/capture`, `/{id}/cancel` | https://docs.onvopay.com/payments/ (sección "Autorización y captura separadas") |
| Métodos de pago (tarjeta, SINPE Móvil `mobile_number`, Credix, Crypto, Apple Pay) | `POST/GET /v1/payment-methods`, `/{id}`, `/{id}/detach`, `/{id}/verify`, `/{id}/verification` | https://docs.onvopay.com/api |
| Checkout hospedado y enlaces de un solo uso | `POST /v1/checkout/sessions/one-time-link`, `GET /v1/checkout/sessions/{id}`, `/confirm`, `/line-item`, `/customer`, `/expire`, `/link/{paymentLinkId}`, `/one-time-link/account` | https://docs.onvopay.com/checkout/overview y /checkout/one-time-links |
| Cargos recurrentes (suscripciones) | `POST/GET /v1/subscriptions`, `/{id}`, `/{id}/confirm`, `/{id}/items`, `/{id}/items/{item}`; renovaciones: `/v1/invoices`, `/v1/invoices/{id}` ("Listar/Obtener renovaciones") | https://docs.onvopay.com/payments/subscriptions |
| Productos y precios | `POST/GET /v1/products`, `/{id}`; `POST/GET /v1/prices`, `/{id}` (precio `recurring` con `interval` e `intervalCount`) | https://docs.onvopay.com/payments/subscriptions |
| Cupones | `/v1/coupons`, `/{id}` | https://docs.onvopay.com/api |
| Clientes | `/v1/customers`, `/{id}`, `/{id}/payment-methods`, `/{id}/subscriptions`, `/{id}/payment-intents` | https://docs.onvopay.com/api |
| SINPE Móvil (solo CRC; asociación automática por identificación + monto exacto) | intent + método `mobile_number` + confirm; conciliación con `GET /v1/mobile-transfers/list` | https://docs.onvopay.com/payments/sinpe-mobile |
| SINPE PIN (IBAN de ONVO, solo bajo solicitud, CRC, tiempo real) | intent + método + confirm | https://docs.onvopay.com/payments/sinpe-pin |
| Reembolsos totales o parciales | `POST /v1/refunds`, `GET /v1/refunds/{id}` | https://docs.onvopay.com/payments/refunds |
| Webhooks | Se configuran en el Dashboard (no hay endpoint documentado); header `X-Webhook-Secret` | https://docs.onvopay.com/webhooks |
| Marketplace / cuentas conectadas | `POST/GET /v1/connected-accounts`, `GET/POST /{id}`, `POST /{id}/weekly-fees`, `POST /{id}/onboarding-link` | https://docs.onvopay.com/payments/marketplaces |
| Onboarding / KYC | Flujo alojado por ONVO (`onboardingUrl`, vence en 7 días); el vendedor indica sus IBAN. Qué documentos o qué KYC se piden: **no documentado** | https://docs.onvopay.com/payments/marketplaces |
| Liquidaciones (payouts) | ONVO liquida al vendedor; los viernes a las 02:00 CR hace el corte de la tarifa semanal. **No hay API de payouts documentada** | https://docs.onvopay.com/payments/marketplaces |
| Validar cuenta bancaria | `POST /v1/bank-accounts/check-info` | https://docs.onvopay.com/api |
| Envíos | `/v1/shipping-rates`, `/{id}` | https://docs.onvopay.com/api |
| Apple Pay | `/v1/payment-method-domains` (+ `/validate`), `/v1/apple-pay/availability` | https://docs.onvopay.com/payments/ (Apple Pay) |
| 3DS, fraude, pruebas, errores, paginación | Guías | https://docs.onvopay.com/ (secciones 3DS, Monitoreo de fraude, Pruebas, Errores, Paginación) |
| Herramientas | SDK web (ONVO.js), plugins de WordPress y Magento, `llms.txt`, OpenAPI | https://docs.onvopay.com/llms.txt |

## 2. Automatizar sub-negocios y el registro

**Sí se puede automatizar.** ONVO Marketplaces permite crear por API una **cuenta conectada** para cada negocio (`POST /v1/connected-accounts`). Para eso se usa la Secret Key de la cuenta primaria, que debe ser una cuenta "estándar" con Marketplace habilitado; si no lo está, ONVO devuelve `400 marketplaces.parent_configuration_invalid`. Las cuentas conectadas no reciben llaves propias: cada cobro se hace con la llave de HotClick y `onBehalfOf=<id de la cuenta>`. El reparto de fondos (split) es automático: ONVO descuenta su comisión (3.5 %) y la retención (2 %), deposita la `marketplaceAppFee` (%) en la cuenta primaria y liquida el resto al vendedor. Además se puede cobrar una tarifa fija semanal (`weekly-fees`, en USD o CRC).

### Flujo propuesto cuando un negocio se registra en HotClick
1. HotClick crea la empresa (como hoy).
2. `POST /v1/connected-accounts` con `{businessName (1–50 caracteres), marketplaceAppFee}`. Para Emprendedor sería 9.00 %, igual que `hotclick.planes.emprendedor.comision-pct`. La comisión de PYME y Negocio Plus la tiene que definir Andrés. Se guarda el `id` y `status=pending_onboarding`.
3. Se le entrega al dueño el `onboardingUrl`, que es sensible: no va a logs ni a la base en texto plano y se entrega solo a ese dueño. Si vence a los 7 días, se regenera con `POST /{id}/onboarding-link`, que devuelve 409 si el onboarding ya se completó.
4. El estado se revisa con `GET /v1/connected-accounts/{id}` (pending_onboarding → awaiting_approval → active). **No hay webhook documentado para cambios de estado de la cuenta**, así que hace falta un scheduler que consulte o una consulta bajo demanda. Mientras la cuenta no esté `active`, no se cobra en su nombre (fail-closed).
5. Cliente de facturación: `POST /v1/customers` en la cuenta primaria, porque clientes, productos y precios siempre viven en la primaria.
6. Suscripción al plan: método de pago (tarjeta tokenizada con la llave publicable o ONVO.js) → `POST /v1/subscriptions {customerId, paymentMethodId, items:[{priceId}]}`. La mensualidad la cobra HotClick, así que en este caso **no** se manda `onBehalfOf`. `onBehalfOf` solo se usa en las ventas del negocio a sus compradores.
7. Ventas del negocio: payment intent o checkout con `onBehalfOf=<cuenta conectada>`.

Aclaración: por lo que dice la doc, el "customer" y la "connected account" son objetos distintos. Para facturarle el plan al negocio se usa el customer; para que el negocio cobre sus ventas se usa la connected account.

### Price IDs por plan (tarea pendiente "crear price IDs en ONVO")
**Sí se pueden crear por API**, y la tarea se puede automatizar con un script o job idempotente que corra una vez por modo (test y live):
- `POST /v1/products` → Emprendedor, PYME y Negocio Plus.
- `POST /v1/prices` con `type:"recurring"`, `currency:"USD"`, `recurring:{interval:"month",intervalCount:1}`, en unidad menor: Emprendedor `900` (desde el negocio #71; los primeros 70 siguen gratis con el cupo V127), PYME `2400` y Negocio Plus `4900`.
- Los `id` que devuelve se cargan en el `.env` (`ONVO_PRICE_ID_PYME`, `ONVO_PRICE_ID_NEGOCIO_PLUS` y uno nuevo para Emprendedor, que **hoy no existe en properties**). Nunca van en el código. Los precios de test y los de live son distintos.

### Webhooks necesarios
Eventos documentados: `payment-intent.succeeded`, `payment-intent.failed`, `payment-intent.deferred`, `subscription.renewal.succeeded`, `subscription.renewal.failed`, `checkout-session.succeeded` y `mobile-transfer.received` (este último requiere pedírselo a soporte). Para este flujo hacen falta todos menos el último. Eventos de cuenta conectada y de cancelación de suscripción: **no documentados**.

## 3. Qué más sirve (priorizado)

| # | Funcionalidad | Beneficio para HotClick | Esfuerzo | Riesgo |
|---|---|---|---|---|
| 1 | Crear productos y precios por API | Destraba la tarea pendiente de los price IDs y garantiza paridad test/live | Bajo | Bajo (hay que revisar la idempotencia: listar antes de crear) |
| 2 | Cuentas conectadas + `onBehalfOf` en el registro | Cada negocio cobra con split automático y HotClick no custodia fondos (reemplaza conciliación de wallet manual) | Alto | Alto: dinero de terceros y requisito de cuenta primaria con Marketplace habilitado |
| 3 | SINPE Móvil con asociación automática | Confirmación sin intervención manual y transferencias no coincidentes rechazadas antes de salir | Medio | Medio: la identificación y el monto tienen que coincidir exactamente |
| 4 | `GET /v1/mobile-transfers/list` | Conciliación diaria de SINPE | Bajo | Bajo |
| 5 | Reembolsos parciales por API | Devoluciones y disputas sin entrar al dashboard | Bajo-medio | Medio (validar en HotClick antes de llamar) |
| 6 | Cupones | Promociones de planes | Bajo | Bajo |
| 7 | Tarifa semanal por cuenta conectada | Alternativa o complemento de la mensualidad, descontada de la liquidación | Bajo | Medio: requiere cuentas bancarias en la misma moneda y conviene revisarlo con contabilidad |
| 8 | Autorización y captura | Reservar el monto en pedidos con stock dudoso | Medio | Bajo |
| 9 | Validar cuenta bancaria (`check-info`) | Validar el IBAN antes del onboarding | Bajo | Bajo |
| 10 | Credix (cuotas), Apple Pay, Crypto | Más métodos de pago | Medio | Medio |
| 11 | Monitoreo de fraude (señales) | Menos contracargos | Bajo | Bajo |

## 4. Brechas frente a la integración actual
Lo que ya existe hoy: `OnvoService` (lee `GET /v1/checkout/sessions/{id}` y `GET /v1/payment-intents/{id}`), `OnvoBillingClient`, `OnvoWebhookController` (header `X-Webhook-Secret`; maneja `checkout-session.succeeded` y `payment-intent.succeeded/failed`), `OnvoBillingWebhookHandler` (renovaciones), `OnvoSinpeSupport` y `SinpeCheckoutService`, `OnvoCapturaService`, resilience4j (`onvo`), `payments.onvo.enabled=false` en prod y `true` en dev, migración `V114__billing_onvo.sql`.

Lo que falta:
- **No hay cuentas conectadas ni `onBehalfOf`** (rg: 0 coincidencias). Hoy no se hace split por negocio.
- **No hay price ID de Emprendedor** (solo están `onvo.price-id.pyme` y `negocio-plus`).
- No se crean productos ni precios por API: se esperan IDs creados a mano.
- `OnvoBillingWebhookHandler` escucha `subscription.payment_succeeded`, `subscription.deleted`, `subscription.canceled` y `invoice.*`, que **no están en la documentación de ONVO**. Probablemente sean restos de Stripe, o eventos que nunca van a llegar. Esto hay que revisarlo, sin asumir que la cancelación se va a notificar.
- No se maneja `payment-intent.deferred` en `OnvoWebhookController`.
- No se usan reembolsos, `mobile-transfers/list` ni cupones.
- Faltan columnas para guardar `onvo_connected_account_id`, su estado y la comisión: haría falta una migración nueva y aditiva.

## 5. Riesgos y reglas de HotClick
- **Fail-closed:** sin llave, sin webhook secret o con la cuenta conectada en un estado distinto de `active`, no se cobra ni se marca nada como pagado. El pago solo se da por confirmado con webhook + verificación con GET; nunca con la redirección.
- **Llaves:** solo `onvo_test_` en dev/test y `onvo_live_` en prod. Las cuentas conectadas, los precios y los clientes no se pueden pasar de un modo a otro: hay que crearlos dos veces. El arranque tiene que fallar si las llaves y el perfil no coinciden (como en la rama B).
- **Secretos:** llaves, webhook secret, price IDs y `onboardingUrl` van fuera del código (`.env` / Lightsail) y nunca a logs.
- **Migraciones:** solo aditivas en Flyway (siguiente número libre) y duplicadas en `Actualizado.sql`.
- **Montos** en unidad menor (USD 9 = `900`). SINPE solo acepta CRC.
- **Dependencia comercial:** Marketplace requiere que ONVO habilite la cuenta primaria; Andrés tiene que confirmarlo con ONVO.
- **Nada sin el OK individual de Andrés:** crear precios en live, activar Marketplace, definir comisiones, commits, merges y push.
