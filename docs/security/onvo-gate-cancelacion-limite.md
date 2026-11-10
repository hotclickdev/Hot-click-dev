# Gate fail-closed antes de cancelar un pago ONVO en línea: cobertura y límite

Rama `fix/limpieza-pago-capturado-onvo` (MEDIO limpieza: cobro capturado en ONVO y pedido cancelado por el TTL).

## Regla

Un pago ONVO en línea (checkout hospedado) solo se cancela, se marca FALLIDO o libera stock si ONVO confirma **por GET**
que su payment intent **no cobró**: `requires_payment_method`, `requires_confirmation` o `canceled`, sin
`receivedAmount`, con el mismo `id` y el mismo `mode` que la llave. Lo decide
`OnvoPaymentProvider#revisarCobroAntesDeCancelar` (resultado `SIN_COBRO`).

- Intent `succeeded` con monto, moneda, modo e id iguales: se confirma por la captura idempotente existente
  (`OnvoCapturaService#capturarVerificado`: dedupe por sesión + `SELECT FOR UPDATE` del pago). Si el pedido ya no se puede
  vender (sin stock o ya cancelado) queda `REEMBOLSO_PENDIENTE` con aviso al admin. Nunca se cancela en silencio.
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

## Vías revisadas

| Vía | Antes | Ahora |
|---|---|---|
| `PaymentExpirationCleanupService` NO_PAGADO | expiraba y cancelaba con la sesión expired/unpaid aunque el intent cobró | gate antes de rechazo/expire y otra vez justo antes de cancelar |
| `PaymentExpirationCleanupService` NO_ENCONTRADO (404) | cancelaba | gate (intent guardado); sin intent no cancela |
| `ReservaSospechosaLiberador` (anti-bot) | cancelaba y liberaba pagos ONVO vencidos **sin consultar a ONVO** (fechaExpiracion = creación + 30 min, así que entraban todos los ONVO pendientes recientes) | gate fuera de locks; cada pago en su transacción corta con lock y re-chequeo |
| `PaymentUserCancellationService` (comprador y panel) | `/expire` 404 o expired → FALLIDO | gate después del expire; cobrado → 409 «ya fue recibido» (se confirma o queda REEMBOLSO_PENDIENTE); en duda → 409 |
| `OnvoRechazoService#cerrarSiRechazado` | intent rechazado + expire → FALLIDO | además, última lectura del gate antes de liberar |
| `OnvoPendientesReconsultaService` pendientes | NO_PAGADO → solo rechazo | NO_PAGADO/NO_ENCONTRADO → gate (si cobró, confirma); rechazo solo con SIN_COBRO |
| `OnvoPendientesReconsultaService` cerrados (FALLIDO/CANCELADO) | sesión expired/unpaid o 404 con cobro → no detectaba | gate → captura sobre cancelado → REEMBOLSO_PENDIENTE |
| `ReservaTiendaVencidaService` | solo pedidos sin `Pago` | sin cambio (no aplica) |
| `SinpeOnvoMarketplaceService` (SINPE por intent, proveedor SINPE) | POST cancel + GET canceled antes de liberar | sin cambio (ya gateado por el intent) |

## Límite: el último GET no es atómico

ONVO no ofrece un «cancelá solo si no cobró» atómico, y no se agregan escrituras a ONVO. Entre el último GET
(`SIN_COBRO`) y el commit local que cancela, en teoría el intent puede pasar a `succeeded` (por ejemplo, un cobro que ya
estaba en vuelo, o un reintento del comprador sobre un intent cuya sesión ONVO ya no existe). La ventana es de
milisegundos, pero existe. Mitigaciones:

1. La sesión se expira antes en ONVO (`/expire`, camino existente) en la limpieza y en la cancelación, así que el link de
   pago deja de cobrar. Con 404 no hay link que cobre.
2. El gate se corre otra vez justo antes del cierre (limpieza, rechazo, cancelación).
3. **Compensación del cobro tardío:** la captura sobre un pedido cancelado nunca lo resucita ni se pierde.
   - Webhook `checkout-session.succeeded` o `payment-intent.succeeded`. Este último ahora resuelve ventas en línea por
     el intent guardado o por `metadata.pedidoId` (pista; la sesión, o el intent guardado si hay 404, tiene que
     coincidir). Termina en `COBRADO_SOBRE_CANCELADO` → `REEMBOLSO_PENDIENTE` + aviso al admin (`refund_pending`, 200).
   - Si el webhook se pierde, el respaldo de cerrados (`OnvoPendientesReconsultaService#revisarCerrados`, ventana
     `hotclick.pagos.onvo.respaldo.cerrados-ventana-horas`, por defecto 24 h) relee el intent y deja el mismo
     REEMBOLSO_PENDIENTE.
   - El stock ya liberado no se vuelve a descontar: el reembolso lo resuelve el admin por el flujo existente.
4. Residual no cubierto: un cobro tardío **después** de la ventana del respaldo de cerrados y sin webhook. Para eso queda
   la conciliación manual con el panel de ONVO.

## Otros residuales

- 404 sin intent guardado: el pago queda PENDIENTE y la reserva tomada hasta revisión manual. Es fail-closed y deja la
  alerta en cada vuelta.
- Si ONVO no copia la metadata del checkout al intent, el webhook `payment-intent.succeeded` de una venta en línea solo
  se resuelve por el intent guardado. Si no hay ninguno, responde 200 sin cambios, como antes. La limpieza y el respaldo
  siguen cubriendo el caso.
- Cuando ya no hay sesión de ONVO, un intent `succeeded` con la sesión expired/unpaid o 404 se confirma solo con la
  verificación del intent (monto, moneda, modo e id). Eso relaja el «paid+expired nunca ACEPTAR» de
  `OnvoCobroVerificador#decidir`, que no cambió para el webhook de sesión.
