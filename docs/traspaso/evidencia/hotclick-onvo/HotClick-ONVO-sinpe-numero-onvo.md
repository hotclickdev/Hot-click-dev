# HotClick · SINPE Móvil con el número de ONVO (solo lectura)

Fecha: 23-oct-2026 (hora de Costa Rica). Repo: `hotclickdev/Hot-click-dev`, PR #279, rama `fix/auditoria-pagos-c2-c1`, head `a93f4454`. Todos los números aparecen enmascarados como `[ENM]`. ND = no documentado.

## 1. Cómo lo documenta ONVO
Fuentes: https://docs.onvopay.com/payments/sinpe-mobile y https://docs.onvopay.com/openapi.yaml
- **Flujo:** se crea un payment intent en CRC (`POST /v1/payment-intents`). Luego se crea un payment method `type: mobile_number` con `mobileNumber.identification`, `mobileNumber.identificationType` y `mobileNumber.number`. Ese `number` es el del **comprador**, no el destino. Después se confirma con `POST /v1/payment-intents/{id}/confirm` y el intent pasa a `processing`.
- **Quién define el número destino:** ONVO. La doc trae un número destino por defecto como valor fijo en la página (`[ENM]`). Si el comercio pidió un número personalizado, se usa el que dé soporte de ONVO. El comercio no lo manda en la API.
- **Qué hay que mostrarle al comprador:** según la doc, el número SINPE destino y el **monto exacto**. ONVO concilia con la identificación más el monto exacto y luego emite el webhook `payment-intent.succeeded`.
- **Qué devuelve la API:** en el schema `PaymentIntent.nextAction` solo está documentado `type: redirect_to_url`, con `redirectToUrl.url` y `returnUrl`, y eso aplica a 3DS/Crypto.
  - **ND:** que la respuesta traiga el número destino, una descripción, un código de referencia o una fecha de vencimiento para SINPE.
  - El monto sí sale del propio intent (`amount`, `currency`).
- **Referencia:** solo existe después de la transferencia, como `SINPERefNumber` (25 caracteres) en el schema `MobileTransfer`, vía `GET /v1/mobile-transfers/list` (también trae `paymentIntentId` y el estado). No es un código que se le muestre al comprador antes de pagar.
- **Vencimiento del intent SINPE:** ND.
- El webhook `mobile-transfer.received` aplica solo a números personalizados y se habilita con soporte.

## 2. Usos en la rama del PR #279 (a93f4454)
| archivo:línea | qué hace |
|---|---|
| `Hot_click_outlet/.env.example:63-64` | Comentario "Número destino SINPE Móvil de ONVO (default público de ONVO)" y `ONVO_SINPE_DESTINO=[ENM]`. |
| `Hot_click_outlet/src/main/resources/application.properties:256` | `onvo.sinpe-destino=${ONVO_SINPE_DESTINO:[ENM]}`, con el default de ONVO como fallback. El PR solo agregó 2 líneas a este archivo frente a master. **Ningún código Java lo lee**: no hay `@Value` ni `@ConfigurationProperties`, así que es config muerta. |
| `Hot_click_outlet/frontend/src/pages/checkout/checkoutHelpers.ts:7` | `SINPE_NUMERO = formatTelefonoCR('[ENM]')`: número **fijo en el código** y **distinto** del default de ONVO, o sea un número propio. |
| `.../checkout/checkoutHelpers.ts:8` | `SINPE_TITULAR` = titular personal (HotClick). No aplica si se paga a ONVO. |
| `.../checkout/checkoutHelpers.ts:22` | `copiarNumeroSinpe()` copia ese número fijo. |
| `.../checkout/CheckoutSinpePending.tsx:11,137,144` | Pantalla de pago pendiente: muestra `SINPE_NUMERO` y `SINPE_TITULAR`. |
| `.../checkout/InstruccionesSinpe.tsx:6,31` | Instrucciones: muestra `SINPE_NUMERO`. |
| `.../checkout/PasoPago.tsx:9,48,81` | Subtítulo del método de pago con `{numero: SINPE_NUMERO}`. |
| `src/main/java/com/hotclick/service/pos/PosQrSessionService.java:162,220,232-245` | POS/QR: `sinpeNumero` sale de `destinoSinpe()`. Si SINPE va por Tilopay devuelve "", y si no usa el **WhatsApp o el teléfono de la empresa**. `sinpeRef` es el token[0..8] (línea 163). Es el SINPE manual del comercio, no ONVO. |
| `frontend/src/pages/admin/pos/StepQR.tsx:29,82,192-199` y `posHelpers.ts:90,120` | Muestran el `sinpeNumero` del POS. |
| `frontend/src/features/pos-pago/PosPagoSinpe.tsx:94-101` | Muestra `datos.amount`, `datos.number` y `datos.code` que entrega el SDK de **Tilopay**, no ONVO. |
| `OnvoService.java:249,292` | Crea el PM `type: mobile_number` con los datos del comprador, como dice la doc. |
| Tests: `frontend/tests/qr-mesa-pago.spec.ts:58`, `pos-atajos.spec.ts:167`, `PosQrRespuestaCajeroTest.java:37`, `posPagoFormat.test.ts:46-51` | Fixtures con números (`[ENM]`). |
| Flyway | No encontré migraciones con número destino SINPE. |
| `src/main/resources/static/assets/*.js` | Bundles compilados que llevan los mismos valores y se regeneran en el build. |

Fuera del alcance: `destinoSinpe` en Wallet/Payout (`WalletController.java:118,130`, `PayoutRequest.java:41`, `PayoutModal.tsx`) es la cuenta de **retiro** del comercio. No es el destino del cobro y no se toca.

## 3. Veredicto: qué quitar o cambiar
1. **Quitar el número propio fijo del frontend.** Eso es `checkoutHelpers.ts:7`, `SINPE_TITULAR` en la línea 8 y sus usos en `CheckoutSinpePending.tsx`, `InstruccionesSinpe.tsx` y `PasoPago.tsx`. Hoy el comprador recibe la instrucción de pagarle a un número que no es el de ONVO, y ONVO no conciliaría ese pago.
2. **Servir el destino desde el backend.** Exponer `onvo.sinpe-destino` en un endpoint público de config (por ejemplo en `CheckoutConfigPublicoController` o en la respuesta de crear/confirmar el pago SINPE). Así la línea 256 deja de ser config muerta. Default = el número de ONVO según https://docs.onvopay.com/payments/sinpe-mobile; solo se sobrescribe si soporte asigna uno personalizado.
   - **Ojo:** no se puede "leer de la respuesta de ONVO", porque la API no devuelve el número (**ND** en `nextAction`).
3. **Monto:** mostrar el `amount` del intent creado (tiene que ser exacto, por la doc).
4. **Referencia/código:** no mostrarle al comprador un código inventado como si fuera de ONVO.
   - ONVO no documenta ninguno antes del pago (**ND**).
   - Después del pago, guardar o mostrar `SINPERefNumber` de `/v1/mobile-transfers/list`.
   - La conciliación la hace ONVO por cédula más monto.
5. **Descripción:** ND en la respuesta para SINPE. Si se quiere, que sea un texto propio de HotClick.
6. **Vencimiento:** ND. No mostrar un plazo como si fuera de ONVO. Si hace falta, que sea una política interna.
7. **Titular:** si se muestra, debe ser el que indique ONVO o soporte (ND en la doc). Quitar el nombre personal.
8. **No tocar el POS/Tilopay** (`PosQrSessionService.destinoSinpe`, `PosPagoSinpe.tsx`). Es otro flujo, con el SINPE de la empresa o de Tilopay. Si la decisión de Andrés también cubre el POS, conviene confirmarlo aparte.
9. **Actualizar `.env.example:63-64`** con el número enmascarado y una nota de que se cambia solo si soporte asigna uno. Actualizar los tests o fixtures de checkout.

Enlaces: https://docs.onvopay.com/payments/sinpe-mobile · https://docs.onvopay.com/openapi.yaml (schemas `PaymentIntent.nextAction`, `MobileTransfer`) · https://docs.onvopay.com/webhooks

## 4. ¿Sirve `mobile_number` para cobro presencial en el POS? (solo doc, 25-oct-2026)
Fuentes: https://docs.onvopay.com/payments/sinpe-mobile · https://docs.onvopay.com/payments/testing#sinpe-móvil · https://docs.onvopay.com/webhooks · https://docs.onvopay.com/llms-full.txt · https://docs.onvopay.com/openapi.yaml
- **(a) Restricciones de canal:** ND. La doc no menciona presencial ni POS, y tampoco lo prohíbe. El flujo documentado es neutro respecto al canal. Paso 4: "Mostrá al comprador el número SINPE Móvil destino y el monto exacto." Así que, por lo documentado, una pantalla o un QR en caja es compatible. Un QR SINPE propio de ONVO: ND.
- **(b) Expiración del intent:** ND. No hay campo de expiración para un intent SINPE en `PaymentIntent` ni texto que hable de vencimiento. La doc solo dice que en `processing` "ONVO está esperando recibir y asociar la transferencia". Para el POS conviene un timeout interno y cancelar el intent (política propia).
- **(c) Latencia del webhook:** ND en producción. Lo único documentado son las simulaciones en modo test: "Simula una transferencia correcta 15 segundos después" y "Simula una transferencia correcta 6 minutos después" (testing). La doc define `payment-intent.deferred` como el estado en que "Una intención de pago queda a la espera de aprobación, por ejemplo en un flujo SINPE" (webhooks), pero no dice cuándo se emite. La regla es: "No marques el pago como exitoso en tu sistema hasta recibir `payment-intent.succeeded`."
- **(d) Datos del pagador antes de pagar:** **la identificación sí es obligatoria.**
  - openapi: "Cuando el tipo de método de pago sea `mobile_number`, este objeto será requerido", con `identification` (minLength 12, con guiones) e `identificationType`.
  - Doc: "ONVO la acepta solo si hay una intención de pago en `processing` con la misma identificación y el mismo monto", y "Si no hay una intención que coincida, ONVO rechaza la transferencia antes de que se envíe".
  - El ejemplo trae `mobileNumber.number` (el número del comprador) y `billing.name` y `billing.email`. Si esos son obligatorios: ND. `customer` es opcional (no figura en el flujo).
  - **Implicación para el POS:** hay que pedir en caja la cédula y el tipo de identificación de la cuenta desde la que va a pagar el cliente (si paga con cuenta de empresa, la cédula jurídica), en el formato exacto. Además hay que crear y confirmar el intent **antes** de que transfiera. Si la cédula no coincide con la que reporta su banco, la transferencia se rechaza.
- **Conclusión:** es viable por lo documentado, siempre que se capture la identificación en caja. La expiración, la latencia real y el soporte de QR son ND, así que conviene confirmarlos con soporte de ONVO.
