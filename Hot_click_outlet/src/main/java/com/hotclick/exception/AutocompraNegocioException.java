package com.hotclick.exception;

/**
 * El comprador es dueño o miembro del negocio vendedor (autocompra). Siempre 403 con
 * {@code data.codigo = "AUTOCOMPRA_NEGOCIO"}: un negocio no puede comprarse a sí mismo ni
 * confirmarse a mano un pago propio (G1b: acreditaría billetera sin cobro real).
 */
public class AutocompraNegocioException extends TenantAccessDeniedException {

    public static final String CODIGO = "AUTOCOMPRA_NEGOCIO";
    public static final String MENSAJE =
        "No podés comprar en tu propio negocio ni confirmar a mano el pago de una compra tuya.";

    public AutocompraNegocioException() {
        super(MENSAJE);
    }

    public String getCodigo() {
        return CODIGO;
    }
}
