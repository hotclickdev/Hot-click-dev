# Gate fail-closed antes de cancelar un pago ONVO en línea: cobertura y límite

Rama `fix/limpieza-pago-capturado-onvo` (MEDIO limpieza: cobro capturado en ONVO y pedido cancelado por el TTL).

## Regla

Un pago ONVO en línea (checkout hospedado) solo se cancela, se marca FALLIDO o libera stock si ONVO confirma **por GET**
que su payment intent **no cobró y ya no se puede pagar**: `canceled`, o `requires_payment_method` /
`requires_confirmation` con la sesión `expired` (o inexistente, decidiendo el intent guardado), siempre sin
`receivedAmount`, con el mismo `id` y el mismo `mode` que la llave. Lo decide `OnvoPaymentProvider#revisarCobro`
(resultado `SIN_COBRO`). Con la sesión todavía abierta el resultado es `SIN_COBRO_SESION_ABIERTA` (fix2): solo autoriza
a expirar primero y volver a leer, nunca a liberar.

- Intent `succeeded` con monto, moneda, modo e id iguales:
  - **Expiración automática** (limpieza TTL, respaldo, rechazo): captura idempotente existente
    (`OnvoCapturaService#capturarVerificado`: dedupe por sesión + `SELECT FOR UPDATE` del pago). Confirma si hay stock; sin
    stock o con el pedido ya cancelado queda `REEMBOLSO_PENDIENTE` con aviso al admin.
  - **Cancelación explícita** del comprador, invitado o panel (fix2): el gate corre con `capturar=false` y devuelve
    `COBRADO_SIN_CAPTURAR`. Nunca se confirma la venta: con el pago bloqueado se registra la intención (V238), se
    cancela el pedido, la reserva se libera una sola vez (`stockReservadoEn`) y el pago queda `REEMBOLSO_PENDIENTE` con
    aviso (`OnvoCapturaService#registrarCobroSobreCancelacionExplicita`, `MANDATORY`, en la transacción de quien llama).
  - **Venta ya confirmada** (pago `CAPTURADO` al bloquear): 409, revisión del admin. Sin devolución automática ni
    reversión de stock inferida.
- Error, timeout, respuesta vacía, otro id/modo, estado intermedio (`processing`, `requires_action`,
  `requires_capture`, desconocido) o monto distinto: `EN_DUDA` / `DATOS_DISTINTOS`. No se toca nada; se reintenta en la
  próxima vuelta.
- **Sesión inexistente (404) no prueba que el intent no cobró.** Se usa el intent guardado en el pago
  (`hot_click_pago_tb.onvo_payment_intent_id`, V237, aditiva), que se guarda la primera vez que un GET de la sesión lo
  muestra (verificación del webhook, retorno, respaldo, limpieza o cancelación). Sin intent guardado: `EN_DUDA`, alerta
  `[ALERTA-PAGO]` y revisión manual. El pago queda PENDIENTE con su reserva de stock.
- Solo GET a ONVO. No hay escrituras nuevas a ONVO ni Idempotency-Key. Las escrituras que ya existían (`/expire` de la
  sesión y el cancel del intent SINPE del marketplace) no cambian.
- Modo simulado explícito (`OnvoService#isMockMode`, solo con perfil dev/test sin llave): `SIN_COBRO` como antes, porque
  no hay sesión ni intent reales.

## Vías revisadas (estado en fix2)

| Vía | Qué hace ahora |
|---|---|
| `PaymentExpirationCleanupService` NO_PAGADO | gate antes del rechazo/expire (acepta `SIN_COBRO_SESION_ABIERTA` solo para expirar); expire; última lectura exige `SIN_COBRO` |
| `PaymentExpirationCleanupService` NO_ENCONTRADO (404) | gate con el intent guardado; sin intent no cancela |
| `ReservaSospechosaLiberador` (anti-bot) | **no libera pagos ONVO en línea** (no expira la sesión y no se agregan escrituras a ONVO; la sesión podía seguir pagable). Los cierra la limpieza TTL. Sin llamadas a ONVO |
| `PaymentUserCancellationService` (comprador, invitado, panel) | expire + gate `capturar=false`. `SIN_COBRO`: revalida el pago con `FOR UPDATE` y cancela. Cobrado: REEMBOLSO_PENDIENTE (arriba). En duda / datos distintos / sesión abierta: 409 y la intención queda registrada (commit sin rollback: `noRollbackFor`) |
| `OnvoRechazoService#cerrarSiRechazado` | intent rechazado + expire + última lectura `SIN_COBRO` antes de FALLIDO |
| `OnvoPendientesReconsultaService` pendientes | NO_PAGADO/NO_ENCONTRADO → gate (si cobró, confirma o REEMBOLSO_PENDIENTE si se pidió cancelar); rechazo con `SIN_COBRO` o sesión abierta (el rechazo expira y relee) |
| `OnvoPendientesReconsultaService` cerrados (FALLIDO/CANCELADO) | **conciliación durable sin corte por antigüedad** (abajo) |
| Webhook `checkout-session.succeeded` / `payment-intent.succeeded` | captura idempotente; respeta la intención registrada (cobro → pedido cancelado + REEMBOLSO_PENDIENTE) |
| `ReservaTiendaVencidaService` | sin cambio (solo pedidos sin `Pago`) |
| `SinpeOnvoMarketplaceService` (SINPE por intent) | sin cambio; su propia ventana `sinpe.onvo.cerrados-ventana-horas` (24 h) queda fuera de este alcance |

## Intención explícita de cancelar (V238)

`hot_click_pago_tb.cancelacion_solicitada_en` / `_origen` (USUARIO, INVITADO, PANEL). Se escribe con un UPDATE
condicional (la primera gana; columna `updatable=false` en la entidad para que un save obsoleto no la pise) cuando el
comprador o el panel pide cancelar y ONVO no confirmó todavía que no hubo cobro, o cuando sí cobró. La captura la relee
de la base: con la intención registrada un cobro nunca confirma la venta. Si el `/expire` mismo falla (ONVO caído),
no se registra y el mensaje pide reintentar (comportamiento previo; decisión pendiente, ver abajo).

## Locks y orden

- Comprador/invitado: GET a ONVO sin locks → `FOR UPDATE` del pago (refresh) → pedidos/productos. Mismo orden que la
  captura del webhook (pago → pedidos → productos).
- Panel: `PedidoService#cambiarEstado` ya bloquea el pedido antes; después el pago. Antes, la captura del gate abría
  una transacción `REQUIRES_NEW` que esperaba el mismo pedido desde otra conexión: autobloqueo que PostgreSQL no ve.
  Ahora no hay `REQUIRES_NEW` en ese camino (`guardarIntentId` pasó a `REQUIRED`, la escritura del cobro es
  `MANDATORY`). Un cruce panel (pedido → pago) contra webhook (pago → pedido) es un deadlock entre dos sesiones que
  PostgreSQL detecta y corta (una de las dos recibe error; el webhook se reintenta). No es un cuelgue.
- Pendiente de ejecución real en PostgreSQL: estos órdenes no se validaron con locks reales (H2 no es equivalente).

## Conciliación durable de cerrados (V238)

- Sin corte de 24 h. Reclamo: FALLIDO/CANCELADO ONVO con sesión, `conciliacion_resuelta_en IS NULL` y
  `conciliacion_proxima_en` vencida o NULL, `FOR UPDATE SKIP LOCKED`, por lotes.
- Dentro del reclamo, ANTES de llamar a ONVO, se agenda la próxima reconsulta: backoff `base * 2^(intentos-1)` con tope
  (por defecto 2 min y 1440 min). Tras un reinicio cada pago vuelve a salir cuando le toca; nada vive en memoria.
- Resuelto con cobro: la captura sobre el pedido cancelado deja el pago `REEMBOLSO_PENDIENTE` (sale de la consulta).
- Resuelto sin cobro: solo intent `canceled` (ONVO no lo reutiliza) → `conciliacion_resuelta_en`.
- `requires_payment_method` / `requires_confirmation` con la sesión expirada **no** se dan por resueltos: se siguen
  reconsultando con el tope. A los N intentos (por defecto 30) queda UNA alerta `[ALERTA-PAGO]` para revisión manual.
- Sesión 404 sin intent guardado (p. ej. pagos anteriores a V237): no se puede resolver por GET; sigue con el tope y
  la alerta. Sin backfill: los cerrados históricos entran al primer barrido (ver decisiones).

## Límite: el último GET no es atómico

ONVO no ofrece un «cancelá solo si no cobró» atómico, y no se agregan escrituras a ONVO. Entre el último GET y el commit
local que cancela, el intent puede pasar a `succeeded`. La ventana es la latencia de las llamadas HTTP a ONVO más la
transacción local (no «milisegundos»: incluye timeouts de red). Mitigaciones:

1. En la limpieza TTL, el rechazo y la cancelación explícita la sesión se expira antes en ONVO (`/expire`, camino
   existente). El anti-bot **no** expira: por eso ya no libera pagos ONVO. El respaldo de pendientes no expira y solo
   cancela por el rechazo, que sí expira.
2. El gate se corre otra vez justo antes del cierre (limpieza, rechazo) y la cancelación explícita revalida el pago con
   `FOR UPDATE` después del GET.
3. **Compensación del cobro tardío:** la captura sobre un pedido cancelado o con la cancelación pedida nunca lo resucita:
   `REEMBOLSO_PENDIENTE` + aviso. Si el webhook se pierde, la conciliación durable de cerrados lo encuentra sin límite de
   edad. El stock ya liberado no se vuelve a descontar; el reembolso lo resuelve el admin.

## Otros residuales

- 404 sin intent guardado: el pago queda PENDIENTE con la reserva hasta revisión manual (alerta en cada vuelta).
- Si ONVO no copia la metadata del checkout al intent, `payment-intent.succeeded` de una venta en línea solo se resuelve
  por el intent guardado; la limpieza y la conciliación siguen cubriendo el caso.
- Un intent `succeeded` con la sesión expired/unpaid o 404 se confirma (expiración automática) solo con la verificación
  del intent. Relaja el «paid+expired nunca ACEPTAR» de `OnvoCobroVerificador#decidir`, que no cambió para el webhook.
- El anti-bot ya no acorta la reserva de pagos ONVO: un bot retiene stock hasta el TTL de la pasarela (30 min).

## Decisiones pendientes (no aprobadas; no se eligieron aquí)

1. Horizonte de la conciliación: hoy no se abandona nunca (tope diario). ¿Cuándo pasa a manual y deja de reconsultar?
2. Pagos cerrados anteriores a V238: entran todos al primer barrido (sin backfill). ¿Acotar o escalonar?
3. Valores de backoff y del umbral de alerta (los actuales son técnicos y provisionales).
4. ¿Registrar la intención de cancelar también cuando el `/expire` falla (ONVO caído)?
5. Anti-bot para ONVO: ¿aceptar que la reserva dure el TTL completo, o autorizar otro mecanismo?
6. Mensajes al comprador/panel en los nuevos 409 y en la cancelación con cobro (hoy responde «Pedido cancelado»).
