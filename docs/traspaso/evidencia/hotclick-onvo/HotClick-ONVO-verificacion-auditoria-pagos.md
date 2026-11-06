# HotClick — Verificación de la auditoría de pagos contra la doc de ONVO (25-oct-2026)

**Alcance.** Contrasto `auditoria/parte1-pagos-checkout.md` (master 0c29564) con la doc oficial de ONVO (`llms-full.txt` y `openapi.yaml`, descargados hoy). Es solo lectura: no toqué código ni prod y no hice llamadas live. **ND** marca lo que la doc no documenta. Los hallazgos de código del auditor (líneas, locks) no los puedo verificar desde la doc; solo evalúo lo que depende de ONVO.

## 1. SINPE Móvil en ONVO
**Sí, ONVO procesa SINPE Móvil como método de pago** (https://docs.onvopay.com/payments/sinpe-mobile):
- **Flujo:** se crea una intención en `CRC`, luego un método `type: "mobile_number"` con la identificación del pagador, y después `POST /v1/payment-intents/{id}/confirm`. La intención pasa a `processing`. El comprador transfiere al número de ONVO.
- **Asociación:** ONVO **acepta la transferencia solo si coinciden identificación (con guiones) y monto exacto** con una intención en `processing`. Si no coinciden, la rechaza antes de que el dinero salga.
- **Confirmación:** llega el webhook `payment-intent.succeeded`. La guía dice explícitamente: "No marques el pago como exitoso en tu sistema hasta recibir `payment-intent.succeeded`".
- **Otro evento:** `payment-intent.deferred`, que significa "a la espera de aprobación, por ejemplo en un flujo SINPE", con `status: processing` (https://docs.onvopay.com/webhooks).
- **Estados de la intención** (https://docs.onvopay.com/payments/payment-intents): `requires_payment_method`, `requires_action`, `processing`, `succeeded` y `canceled`.
- **Conciliación:** `GET /v1/mobile-transfers/list`. Si `paymentIntentId` viene `null`, la transferencia no está asociada.

Una inconsistencia de la doc: la guía dice "no acepta pagos parciales", pero https://docs.onvopay.com/payments/testing tiene un escenario "Parcial", con dos transferencias del 50 %. **El comportamiento parcial en live es ND**; hay que preguntarle a ONVO.

**¿Sobra el flujo manual de comprobante?** Para los cobros SINPE **hechos por ONVO**, sí: la confirmación es automática y verificable (webhook + GET), y la imagen no aporta nada. **No se puede eliminar todavía** por tres razones:
1. Hay que validar en test que el flujo SINPE de ONVO está activo en la cuenta.
2. El comprador tiene que dar su identificación con el formato exacto. Eso es fricción nueva y un dato personal que hay que tratar con cuidado.
3. Mientras el flujo manual siga en prod, aunque sea como respaldo, C1, C5, C8, M5 y M6 siguen siendo explotables.

Recomendación: migrar SINPE a ONVO, apagar el flujo manual con un flag y recién ahí retirarlo. Hasta entonces, los arreglos se mantienen.

## 2. Modo test o live (C2)
- **Llaves:** los prefijos son `onvo_test_secret_key_`, `onvo_live_secret_key_`, `onvo_test_publishable_key_` y `onvo_live_publishable_key_` (https://docs.onvopay.com/authentication).
- **El modo lo define la llave:** "El modo queda determinado por la llave enviada en el encabezado `Authorization`" (https://docs.onvopay.com/, sección *Ambientes*).
- **Campo `mode`:** los objetos traen `mode` (`test`/`live`). Aparece en los payloads de ejemplo de `payment-intent.succeeded` y de las renovaciones (https://docs.onvopay.com/webhooks) y en los esquemas del OpenAPI (https://docs.onvopay.com/openapi.yaml), donde es `readOnly`.
- **Lo que la doc no garantiza:** que `mode` venga en todos los eventos (el ejemplo de `payment-intent.failed` no lo trae en la raíz de `data`, solo dentro de `error`). Eso es **ND**.
- **Fail-closed propuesto:**
  1. Al arrancar, fallar si el perfil prod no tiene una llave `onvo_live_`.
  2. En cada confirmación, exigir que el GET de la intención devuelva `mode == live` en prod. Si viene ausente o distinto, rechazar y alertar, y nunca capturar el pedido.
  3. Los pedidos hechos con la llave de prueba quedan marcados `esPrueba` y no descuentan stock ni despachan, como propone el auditor.

## 3. Contrato de webhooks (C6, C9, C10)
Fuente: https://docs.onvopay.com/webhooks

| Tema | Lo que documenta ONVO |
|---|---|
| Formato | `POST` JSON `{type, data}`, donde `data` es un *snapshot* del objeto |
| Firma / secret | Header `X-Webhook-Secret` con el secret del webhook, configurado en el Dashboard. **No hay firma HMAC** ni timestamp, así que tampoco hay protección anti-replay documentada. |
| Respuesta | `2xx` solo si el evento se procesó; si no, "ONVO registra la entrega como fallida" |
| **Reintentos** | **ND**: no se documenta si ONVO reintenta, cuántas veces ni con qué backoff |
| Orden | "Tu sistema debe tolerar eventos recibidos fuera de orden" |
| Idempotencia | Se pide procesar "de forma idempotente". **No hay event id**, así que hay que deduplicar por `type` + `data.id` + estado. |
| Campos garantizados | **ND**: los ejemplos "muestran los campos más importantes" y `data` "puede incluir campos adicionales o valores `null`" |
| Fuente de verdad | Crypto exige confirmar `succeeded` desde el servidor; en general, "confirmá el estado final por webhook" (https://docs.onvopay.com/payments/payment-intents). El GET de verificación que ya hace HotClick es coherente con eso. |

## 4. Veredictos
| Ítem | Veredicto | Razón | Doc |
|---|---|---|---|
| **C1** comprobantes públicos en S3 | **Se mantiene** | Mientras el flujo manual exista, la exposición de datos personales es real. Si SINPE pasa a ONVO, desaparece junto con el flujo, pero eso todavía no ocurrió. | https://docs.onvopay.com/payments/sinpe-mobile |
| **C2** llave test en prod | **Se cambia** (se refuerza) | Además del flag y `esPrueba`: fallar al arrancar si el prefijo de la llave no es `onvo_live_` en prod, y exigir `mode=live` en el GET de cada cobro. Lo mínimo inmediato (allowlist de QA) sigue valiendo. | https://docs.onvopay.com/authentication · https://docs.onvopay.com/ (Ambientes) · https://docs.onvopay.com/webhooks |
| **C5** carrera aprobar/rechazar SINPE | **Se mantiene** (temporal) | El bug existe mientras haya aprobación manual. Con SINPE vía ONVO no hay aprobación humana y la carrera pasa al webhook, que queda cubierto por C6. | https://docs.onvopay.com/payments/sinpe-mobile |
| **C6** captura sin lock (webhook + retorno) | **Se cambia** (matiz) | El arreglo (ForUpdate y DUPLICADO → `2xx`) es correcto, porque la doc exige idempotencia y tolerar el desorden. Pero la premisa de que "ONVO reintenta" es **ND**: no hay que depender de reintentos, así que conviene sumar reconciliación por GET o un job. | https://docs.onvopay.com/webhooks |
| **C8** comprobante de invitado enumerable | **Se mantiene** (temporal) | Es un problema propio de HotClick, sin relación con ONVO. Se elimina cuando se retire el flujo manual. | — (no depende de ONVO) |
| **C9** acepta `mode`/`id` ausentes | **Se mantiene** (se sube a MEDIO) | La doc no garantiza campos (**ND**) y `mode` es el único discriminador test/live. En live hay que rechazar si falta, no solo alertar. | https://docs.onvopay.com/webhooks · https://docs.onvopay.com/openapi.yaml |
| **C10** GET fuera de la transacción | **Se mantiene** | Hacer el GET fuera de la transacción está bien, porque evita bloqueos durante una llamada de red. Lo que hay que asegurar es volver a validar el estado del pedido con lock antes de capturar. Con eventos fuera de orden documentados, la prueba es necesaria. | https://docs.onvopay.com/webhooks · https://docs.onvopay.com/payments/payment-intents |
| **M5** comprobante privado con visor admin | **Se mantiene** (temporal) | Va atado a C1. Si se adopta SINPE vía ONVO, se descarta en vez de construirse a largo plazo: conviene un arreglo mínimo y no invertir en el visor. | https://docs.onvopay.com/payments/sinpe-mobile |
| **M6** validar tipo y tamaño del comprobante | **Se mantiene** (temporal) | Es barato y reduce riesgo mientras exista el upload. Desaparece con el flujo manual. | https://docs.onvopay.com/payments/sinpe-mobile |

## 5. Lo que hay que preguntarle a ONVO (ND)
Política de reintentos de webhooks; si hay firma HMAC o anti-replay; campos garantizados (sobre todo `mode` en todos los eventos); comportamiento de pagos SINPE parciales en live; si SINPE Móvil está disponible dentro de Checkout hospedado (no lo verifiqué en esta revisión).
