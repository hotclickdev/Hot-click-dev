package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de recuperación de carrito abandonado (Figma «Correo · Recuperación de carrito», 30:1733).
 * Detalle por producto: tienda (si es un emprendimiento visible), unidades y «Quedan N» cuando el
 * stock disponible es bajo. Tienda y stock los completa {@code CarritoAbandonadoService#itemsConDisponibilidad}.
 */
@Component
class RecuperacionCarritoEmailBuilder {

    static final String ASUNTO = "Tus productos te esperan en HotClick";

    /** Mismo tope que la insignia «Quedan N» del catálogo ({@code STOCK_ESCASO_MAX} del frontend, CAT_C0). */
    static final int STOCK_ESCASO_MAX = 5;

    @Autowired private EmailLayoutHelper layout;

    String buildRecuperacionCarrito(
            String tokenRecuperacion,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {

        StringBuilder filas = new StringBuilder();
        for (CarritoAbandonadoRequestDTO.CartItemDTO item : items) {
            int cantidad = item.getCantidad() != null ? item.getCantidad() : 1;
            int subtotal = (item.getPrecio() != null ? item.getPrecio() : 0) * cantidad;
            filas.append(layout.filaProducto(
                item.getImagenUrl(),
                layout.esc(item.getNombre()),
                detalle(item, cantidad),
                layout.monto(subtotal)));
        }

        String recoverUrl = appUrl + "/recuperar-carrito/" + tokenRecuperacion;

        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_INFO, "carrito", "Tus productos te esperan",
                "Guardamos tu carrito para que termines la compra cuando quieras.")
            + layout.abrirCuerpo()
            + layout.caja(filas.toString())
            + layout.cta(recoverUrl, "Volver a mi carrito")
            + layout.notaPequena("Si ya no querés recordatorios, simplemente ignorá este mensaje.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }

    private String detalle(CarritoAbandonadoRequestDTO.CartItemDTO item, int cantidad) {
        String detalle = layout.detalleUnidades(item.getEmpresaNombre(), cantidad);
        Integer stock = item.getStock();
        return stock != null && stock > 0 && stock <= STOCK_ESCASO_MAX ? detalle + " · Quedan " + stock : detalle;
    }
}
