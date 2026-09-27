package com.hotclick.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Lo que el vendedor necesita para despachar su paquete de una compra multi-negocio.
 * Solo trae datos de su paquete; de los demás, apenas el nombre del negocio.
 */
public record DespachoPaqueteDTO(
    Long pedidoId,
    String numeroCompra,
    int numeroPaquete,
    int cantidadPaquetes,
    String negocio,
    List<String> otrosNegocios,
    String estado,
    String metodoEnvio,
    String numeroGuia,
    ClienteEnvio cliente,
    List<Linea> productos,
    Pago pago
) {
    public record ClienteEnvio(String nombre, String telefono, String direccion) {}

    public record Linea(String nombre, int cantidad, int subtotal, String imagenUrl) {}

    /** {@code venta + envio - comision = aRecibir}; mismo cálculo que el wallet. */
    public record Pago(long venta, long envio, long comision, BigDecimal porcentaje,
                       long minimo, String plan, long aRecibir) {}
}
