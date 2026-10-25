package com.hotclick.security;

import java.util.Set;

/**
 * Lista blanca de escrituras que un miembro CAJERO puede hacer (todo lo demás: 403 en
 * LectorSoloLecturaInterceptor). Se compara "MÉTODO patrón" contra el patrón exacto del handler resuelto
 * (HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE); sin patrón, se niega.
 * <p>
 * Va centralizada acá (y no como anotación en cada controller) para no tocar PosQrController, que es
 * archivo de pagos, y para que la superficie del rol se audite en un solo lugar.
 * <p>
 * Pendiente: la anulación del turno abierto de #292 (feat/cajero-anulaciones, PosAnulacionController) no está
 * en master. Cuando #292 se mergee hay que agregar acá su ruta de anulación (solo la de CAJERO; la devolución
 * y la anulación de turno cerrado son del dueño/ADMIN y deben seguir en 403 para CAJERO), con su test.
 */
public final class CajeroPermisos {

    public static final Set<String> RUTAS = Set.of(
        "POST /api/pos/venta",                      // venta POS
        "POST /api/pos/caja/abrir",                 // abrir turno
        "PUT /api/pos/caja/{id}/cerrar",            // cerrar turno
        "POST /api/pos/qr",                         // crear cobro QR
        "PUT /api/pos/qr/{token}/confirmar-sinpe",  // confirmar SINPE recibido en caja
        "DELETE /api/pos/qr/{token}"                // cancelar cobro QR
    );

    private CajeroPermisos() {}

    static boolean permite(String metodo, Object patron) {
        if (metodo == null || patron == null) return false;
        return RUTAS.contains(metodo + " " + patron);
    }
}
