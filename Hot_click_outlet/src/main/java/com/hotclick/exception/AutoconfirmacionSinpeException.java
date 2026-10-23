package com.hotclick.exception;

/**
 * Quien confirma a mano un SINPE en caja es quien generó la venta (sesión QR). Siempre 403 con
 * {@code data.codigo = "AUTOCONFIRMACION_SINPE"}; mismo patrón que {@link AutocompraNegocioException} (G1b, PR #232).
 */
public class AutoconfirmacionSinpeException extends TenantAccessDeniedException {

    public static final String CODIGO = "AUTOCONFIRMACION_SINPE";
    public static final String MENSAJE =
        "El SINPE lo tiene que confirmar otra persona distinta a quien generó la venta.";

    public AutoconfirmacionSinpeException() {
        super(MENSAJE);
    }

    public String getCodigo() {
        return CODIGO;
    }
}
