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

    /**
     * Igual que {@link #ocultandoExistencia(Producto, Long, Long)} pero con solo el dueño del producto (consulta
     * escalar, sin cargar la entidad). {@code empresaDueno == null} = el producto no existe.
     */
    public static void ocultandoExistenciaDeDueno(Long empresaDueno, Long productoId, Long empresaCaja) {
        if (empresaDueno == null) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_NO_ENCONTRADO, "producto inexistente id=" + productoId);
        }
        if (!empresaDueno.equals(empresaCaja)) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_NO_ENCONTRADO,
                "producto id=" + productoId + " de otro negocio (caja empresa=" + empresaCaja + ")");
        }
    }

    /**
     * BAJO-1 (#428): valida el dueño SIN bloquear y solo después toma {@code SELECT … FOR UPDATE}. Así, quien manda
     * el id de un producto ajeno o inexistente no puede bloquear filas de otro negocio (ni medir esperas) y recibe
     * el mismo 404 de texto fijo. La validación previa es una consulta escalar (no carga la entidad), de modo que
     * el producto que devuelve es el leído bajo el lock (stock fresco, sin copia vieja en la sesión JPA).
     */
    public static Producto bloqueandoSoloSiEsDelNegocio(com.hotclick.repository.ProductoRepository repo,
                                                        Long productoId, Long empresaCaja) {
        ocultandoExistenciaDeDueno(repo.findEmpresaIdById(productoId).orElse(null), productoId, empresaCaja);
        return ocultandoExistencia(repo.findByIdForUpdate(productoId).orElse(null), productoId, empresaCaja);
    }

    /**
     * Misma regla para la bodega que el cajero manda en el cuerpo (PosQrPedidoFactory:111): inexistente y de otro
     * negocio dan el mismo 404 de texto fijo, sin id.
     */
    public static com.hotclick.model.Bodega ocultandoExistenciaBodega(com.hotclick.model.Bodega bodega, Long bodegaId, Long empresaCaja) {
        if (bodega == null) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_BODEGA_NO_ENCONTRADA, "bodega inexistente id=" + bodegaId);
        }
        if (bodega.getEmpresaId() == null || !bodega.getEmpresaId().equals(empresaCaja)) {
            throw RecursoNoEncontradoException.conDetalle(MENSAJE_BODEGA_NO_ENCONTRADA,
                "bodega id=" + bodegaId + " de otro negocio (caja empresa=" + empresaCaja + ")");
        }
        return bodega;
    }

    public static final String MENSAJE_NO_ENCONTRADO = "Producto no encontrado";
    public static final String MENSAJE_BODEGA_NO_ENCONTRADA = "Bodega no encontrada";
}
