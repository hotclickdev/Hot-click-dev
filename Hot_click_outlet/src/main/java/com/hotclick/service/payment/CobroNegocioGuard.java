package com.hotclick.service.payment;

import com.hotclick.model.Empresa;

/**
 * NP-13, neutral de pasarela: un negocio no aprobado no puede cobrar en línea ni por QR, sea cual sea el
 * proveedor (Tilopay hoy, ONVO cuando se migre). El efectivo del POS no pasa por aquí.
 * Cualquier proveedor nuevo debe llamar a {@link #exigirNegocioAprobado} antes de crear la sesión de cobro.
 */
public final class CobroNegocioGuard {

    public static final String MSG_NO_APROBADO =
        "Tu negocio todavía no está aprobado: por ahora en la caja solo podés registrar ventas en efectivo. "
            + "El cobro con tarjeta o SINPE por QR se habilita cuando lo aprobemos.";

    private CobroNegocioGuard() {}

    public static void exigirNegocioAprobado(Empresa empresa) {
        if (empresa == null || !"ACTIVO".equals(empresa.getEstadoEmpresa())) {
            throw new IllegalStateException(MSG_NO_APROBADO);
        }
    }
}
