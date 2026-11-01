package com.hotclick.dto;

import com.hotclick.model.Carrito;
import com.hotclick.model.CarritoItem;

import java.time.LocalDateTime;
import java.util.List;

/**
 * QA5-CA-01: respuesta de /api/carrito. Antes se serializaba la entidad Carrito y Jackson
 * recorría usuarioFinal → Usuario.roles (LAZY) fuera de la sesión (open-in-view=false) → 500.
 * Se arma dentro de la transacción y solo expone ids, nunca la entidad Usuario/Empresa.
 */
public record CarritoDTO(Long id, String estadoCarrito, Integer totalCarrito,
                         LocalDateTime fechaActualizacion, List<Item> items) {

    public record Item(Long id, Long productoId, String nombreProducto,
                       Integer cantidad, Integer precioUnitario) {
        static Item de(CarritoItem i) {
            var p = i.getProducto();
            return new Item(i.getId(), p == null ? null : p.getId(),
                p == null ? null : p.getNombreProducto(), i.getCantidad(), i.getPrecioUnitarioMomento());
        }
    }

    public static CarritoDTO de(Carrito c) {
        return new CarritoDTO(c.getId(), c.getEstadoCarrito(), c.getTotalCarrito(),
            c.getFechaActualizacion(), c.getItems().stream().map(Item::de).toList());
    }
}
