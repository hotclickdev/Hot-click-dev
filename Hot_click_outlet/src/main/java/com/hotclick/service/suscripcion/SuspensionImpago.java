package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.utils.Constants;

/**
 * Suscripción impaga (decisión 26-oct-2026): tras los días de gracia la tienda queda SUSPENDIDO_IMPAGO
 * (oculta del catálogo, sin ventas por ninguna vía). Al confirmarse el pago vuelve a ACTIVO. Nunca borra datos.
 */
public final class SuspensionImpago {

    private SuspensionImpago() {}

    public static boolean estaSuspendida(String estadoEmpresa) {
        return Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO.equals(estadoEmpresa);
    }

    /** Reactiva solo una suspensión por impago; no toca rechazos, bajas ni suspensiones manuales. */
    public static boolean reactivarSiSuspendida(Empresa empresa) {
        if (empresa == null || !estaSuspendida(empresa.getEstadoEmpresa())) return false;
        empresa.setEstadoEmpresa("ACTIVO");
        return true;
    }
}
