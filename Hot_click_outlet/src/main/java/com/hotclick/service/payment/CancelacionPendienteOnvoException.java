package com.hotclick.service.payment;

/**
 * fix2 (cancelación explícita del comprador): ONVO todavía no confirmó si el pago cobró. El pedido no se cancela ahora
 * pero la intención quedó registrada en el pago (V238): si ONVO cobra, el pedido se cancela y el pago queda
 * REEMBOLSO_PENDIENTE (nunca se confirma la venta). Es un IllegalStateException para que el controlador responda 409;
 * la transacción no se revierte por esta excepción (noRollbackFor) para que la intención quede guardada.
 */
public class CancelacionPendienteOnvoException extends IllegalStateException {

    public CancelacionPendienteOnvoException(String mensaje) {
        super(mensaje);
    }
}
