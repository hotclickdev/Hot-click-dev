package com.hotclick.agente.enlace;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Respuesta pública de {@code GET /api/public/enlace/{codigo}}. No incluye el id del enlace, el del pedido, el de la
 * sesión, el canal ni el contacto completo: solo lo que el comprador necesita para ver y pagar su carrito.
 * Los {@code productoId} son los mismos del catálogo público.
 */
public record EnlaceAbiertoDto(
    LocalDateTime vence,
    /** Hasta cuándo está reservado el stock (30 min desde la última apertura); null si no se pudo reservar nada. */
    LocalDateTime reservaHasta,
    /** Nombre para prellenar el checkout (el que dio el cliente al bot). */
    String nombreCliente,
    /** Teléfono enmascarado (solo últimos 4 dígitos); el completo nunca sale del servidor, ver {@link EnlaceCompraVinculo}. */
    String telefonoMascara,
    boolean precioCambio,
    boolean stockCambio,
    int totalCreado,
    int totalActual,
    List<Item> items
) {
    /** Sin el nombre ni el teléfono enmascarado del cliente (AG-14 H-07). */
    @Override
    public String toString() {
        return "EnlaceAbiertoDto[items=" + (items == null ? 0 : items.size()) + ", totalActual=" + totalActual + "]";
    }

    public record Item(
        Long productoId,
        String nombre,
        String imagenUrl,
        /** Unidades que quedaron reservadas y que se cargan al carrito. */
        int cantidad,
        int cantidadSolicitada,
        int precioUnitario,
        int precioCreado,
        boolean disponible
    ) { }
}
