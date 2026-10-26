# Spec M-08: sobreventa después del cobro (pendiente de decisión de Andrés)

Origen: re-QA área 3 (Marketplace), PR #349 (M-08 retirado del PR). Spec de HotClick Seguridad, 26-oct-2026.
Responsable propuesto: Dev Pagos (toca OnvoCapturaService, webhooks, Tilopay, SINPE, Stripe, manual). NO entregar hasta que Grok Bot confirme la decisión.

## Problema
StockReservationService:128-137 recorta la sobreventa a 0 con solo log.error. Si en cambio se lanza excepción dentro de capturarVerificado (REQUIRES_NEW):
- rollback de PAGO_CAPTURADO, WebhookEvent y stock;
- el controller responde 500 a ONVO, que reintenta sin fin;
- el cleanup no cancela (onvoPermiteCancelar=false): pedido PENDIENTE para siempre, plata cobrada y sin registro.

## Opciones para Andrés
(a) Fallar la confirmación y que Dev Pagos maneje reembolso/reintentos (Seguridad: NO aceptable).
(b) Registrar el pago y dejar el pedido en revisión por sobreventa (recomendada por Seguridad).

## Fix propuesto (opción b)
1. PaymentOrderConfirmationService.confirmarPedido: verificar con lock el stock de todo el grupo antes de consumir. Si falta stock, sin excepción:
   - grupo a estado PEDIDO_REVISION_SOBREVENTA (no despachable);
   - liberar reservas sin stock negativo;
   - pago como PAGO_REEMBOLSO_PENDIENTE;
   - log [ALERTA-PAGO] sin PII;
   - devolver un resultado (no excepción) para que haga commit.
2. OnvoCapturaService: nuevo Captura.COBRADO_SOBREVENTA; evento queda procesado; webhook responde 200 refund_pending, idempotente.
3. Igual en Tilopay, SINPE, Stripe y manual (el manual puede responder 409 al admin sin perder el registro).
4. Tests:
   - webhook con sobreventa: 2xx, pago persistido, pedido en revisión, sin stock negativo, alerta emitida;
   - segundo webhook: DUPLICADO;
   - el cleanup no lo cancela.
