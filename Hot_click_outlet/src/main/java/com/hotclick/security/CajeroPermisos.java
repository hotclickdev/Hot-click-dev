package com.hotclick.security;

import java.util.Set;

/**
 * Listas blancas de lo que un miembro CAJERO puede hacer: {@link #RUTAS} (escrituras) y {@link #LECTURAS}
 * (GET/HEAD). Todo lo demás: 403 en LectorSoloLecturaInterceptor, incluidas las lecturas de clientes, reportes,
 * billetera, etc. Se compara "MÉTODO patrón" contra el patrón exacto del handler resuelto
 * (HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE); sin patrón, se niega.
 * <p>
 * Va centralizada acá (y no como anotación en cada controller) para no tocar PosQrController, que es
 * archivo de pagos, y para que la superficie del rol se audite en un solo lugar.
 * <p>
 * Pendiente: la anulación del turno abierto de #292 (feat/cajero-anulaciones, PosAnulacionController) no está
 * en master. Cuando #292 se mergee hay que agregar acá su ruta de anulación (solo la de CAJERO; la devolución
 * y la anulación de turno cerrado son del dueño/ADMIN y deben seguir en 403 para CAJERO), con su test.
 * <p>
 * NO incluido a propósito: {@code PUT /api/pos/qr/{token}/confirmar-sinpe} (confirmación manual de un SINPE
 * "recibido" = marcar una venta como pagada sin evidencia del banco). Habilitarlo para CAJERO es decisión de
 * Andrés y requeriría antes: tope de monto por confirmación, alerta Telegram al dueño y conciliación contra el
 * estado de cuenta. Hasta entonces el CAJERO recibe 403 y la confirmación manual la hace el dueño/EDITOR.
 */
public final class CajeroPermisos {

    public static final Set<String> RUTAS = Set.of(
        "POST /api/pos/venta",                      // venta POS
        "POST /api/pos/caja/abrir",                 // abrir turno
        "PUT /api/pos/caja/{id}/cerrar",            // cerrar turno
        "POST /api/pos/qr",                         // crear cobro QR
        "DELETE /api/pos/qr/{token}"                // cancelar cobro QR
    );

    /**
     * Lecturas que necesita el front del POS (posService.ts, useAdminPOS, BodegaSelectorModal,
     * usePOSProductSearch) y el perfil propio. HEAD se evalúa como GET. Fuera a propósito: historiales del
     * negocio (/api/pos/historial, /api/pos/caja/historial: ventas y turnos de toda la empresa), kardex,
     * clientes (/api/ventas/clientes, /api/crm/**), reportes y billetera.
     */
    public static final Set<String> LECTURAS = Set.of(
        "GET /api/pos/caja/activo",                 // turno abierto propio
        "GET /api/bodegas",                         // selector de bodega del POS
        "GET /api/productos/pos/categorias",        // catálogo POS
        "GET /api/productos/pos/categoria/{catId}", // productos + stock por categoría
        "GET /api/productos/buscar",                // búsqueda de producto para vender
        "GET /api/usuarios/{id}"                    // perfil propio (assertSelfOrAdmin en el controller)
    );

    private CajeroPermisos() {}

    static boolean permite(String metodo, Object patron) {
        if (metodo == null || patron == null) return false;
        return RUTAS.contains(metodo + " " + patron);
    }

    static boolean permiteLectura(String metodo, Object patron) {
        if (metodo == null || patron == null) return false;
        String m = "HEAD".equals(metodo) ? "GET" : metodo;
        return LECTURAS.contains(m + " " + patron);
    }
}
