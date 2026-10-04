package com.hotclick.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Respuesta del seguimiento público de pedido (/api/public/pedidos/seguimiento/{token}).
 *
 * Mínima a propósito (Ley 8968): estado, fechas, productos y guía por paquete. Sin ids,
 * costos, márgenes, sku, precios por línea, dirección, teléfono, correo ni datos de pago.
 */
public record SeguimientoPedidoPublicoDTO(
    String numeroPedido,
    LocalDateTime fechaPedido,
    Integer total,
    /** El comprador usó checkout de invitado: se le ofrece activar su cuenta con ese correo. */
    boolean invitarCrearCuenta,
    List<Paquete> paquetes
) {

    /** Un paquete por vendedor/bodega de origen (checkout multivendedor). */
    public record Paquete(
        String tienda,
        String origen,
        String estado,
        boolean retiroEnTienda,
        LocalDate fechaEntrega,
        String numeroGuia,
        String courier,
        String urlRastreo,
        List<Producto> productos
    ) {}

    public record Producto(String nombre, String imagenUrl, Integer cantidad) {}
}
