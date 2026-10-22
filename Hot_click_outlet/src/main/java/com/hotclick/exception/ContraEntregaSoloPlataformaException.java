package com.hotclick.exception;

/**
 * La contra entrega de Envío Normal la cobra el mensajero de HotClick: solo la plataforma confirma el pago.
 * Siempre 403 con {@code data.codigo = "CONTRA_ENTREGA_SOLO_PLATAFORMA"}.
 */
public class ContraEntregaSoloPlataformaException extends TenantAccessDeniedException {

    public static final String CODIGO = "CONTRA_ENTREGA_SOLO_PLATAFORMA";
    public static final String MENSAJE =
        "Esta contra entrega con envío normal la cobra el mensajero de HotClick; solo HotClick puede confirmar el pago.";

    public ContraEntregaSoloPlataformaException() {
        super(MENSAJE);
    }
}
