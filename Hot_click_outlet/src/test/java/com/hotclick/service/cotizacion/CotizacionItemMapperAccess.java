package com.hotclick.service.cotizacion;

/** Acceso de prueba al cálculo package-private del mapper. */
public final class CotizacionItemMapperAccess {
    private CotizacionItemMapperAccess() {}
    public static int subtotal(int precio, int cantidad, int desc) {
        return CotizacionItemMapper.subtotalLinea(precio, cantidad, desc);
    }
}
