package com.hotclick.service.pos;

/**
 * Un negocio del marketplace solo vende en POS lo que él creó.
 */
public final class PosProductoDeEmpresa {

    private PosProductoDeEmpresa() {}

    public static void exigirMismoNegocio(Long empresaProducto, Long empresaCaja) {
        if (empresaProducto == null || !empresaProducto.equals(empresaCaja)) {
            throw new IllegalArgumentException("El producto no pertenece a este negocio");
        }
    }
}
