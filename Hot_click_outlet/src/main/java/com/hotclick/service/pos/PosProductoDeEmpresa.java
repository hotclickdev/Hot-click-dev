package com.hotclick.service.pos;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;

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

    /**
     * Para endpoints de consulta (p. ej. {@code /pos/venta/cotizar}): un producto que no existe y uno de otro
     * negocio responden idéntico (404 con texto fijo), para que el endpoint no sirva de oráculo de ids ajenos.
     * El detalle real solo va al log del servidor (sin datos del cliente).
     */
    public static Producto ocultandoExistencia(Producto producto, Long productoId, Long empresaCaja) {
        if (producto == null) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_NO_ENCONTRADO, "producto inexistente id=" + productoId);
        }
        if (producto.getEmpresaId() == null || !producto.getEmpresaId().equals(empresaCaja)) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_NO_ENCONTRADO,
                "producto id=" + productoId + " de otro negocio (caja empresa=" + empresaCaja + ")");
        }
        return producto;
    }

    public static final String MENSAJE_NO_ENCONTRADO = "Producto no encontrado";
}
