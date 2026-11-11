package com.hotclick.exception;

/**
 * fix2 (cancelación explícita desde el panel): ONVO no confirmó todavía si el pago cobró, así que el pedido no se
 * cancela ahora, pero la intención de cancelar quedó registrada en el pago (V238). Si ONVO termina cobrando, el pedido
 * se cancela y el pago queda REEMBOLSO_PENDIENTE; nunca se confirma la venta en silencio. 409 con el mensaje tal cual.
 * La transacción del panel NO se revierte por esta excepción (noRollbackFor), para que la intención quede guardada.
 */
public class CancelacionSolicitadaRegistradaException extends CancelacionPagoNoCerradaException {

    public CancelacionSolicitadaRegistradaException(String mensaje) {
        super(mensaje);
    }
}
