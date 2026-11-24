package com.hotclick.agente.enlace;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;

/** Fábricas de datos de prueba (sin teléfonos ni datos reales). */
final class EnlaceTestSupport {

    private EnlaceTestSupport() { }

    static Empresa empresa(long id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setEsPrueba(false);
        return e;
    }

    static Producto producto(long id, Empresa empresa, int precio, int stock) {
        Producto p = new Producto();
        p.setId(id);
        p.setNombreProducto("Leche deslactosada 1 L " + id);
        p.setPrecioVenta(precio);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setVisibleCatalogo(true);
        p.setEstado(1);
        p.setEmpresa(empresa);
        return p;
    }

    /** Enlace de prueba con un ítem por producto (cantidad y precio de creación dados). */
    static EnlaceCompra enlace(String codigo, Long empresaId, String canal, String contacto, Producto p, int cantidad, int precioCreado,
                               java.time.LocalDateTime creado) {
        EnlaceCompra e = new EnlaceCompra();
        e.setCodigo(codigo);
        e.setEmpresaId(empresaId);
        e.setCanal(canal);
        e.setContactoExterno(contacto);
        e.setNombreCliente("Cliente Prueba");
        e.setCreado(creado);
        e.setVence(creado.plusHours(24));
        e.setPrecioTotalCreado(precioCreado * cantidad);
        e.agregarItem(new EnlaceCompraItem(p.getId(), cantidad, precioCreado));
        return e;
    }
}
