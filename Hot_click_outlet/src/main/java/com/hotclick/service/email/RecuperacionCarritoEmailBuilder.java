package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de recuperación de carrito abandonado (Figma «Correo · Recuperación de carrito», 30:1733).
 * Figma muestra la tienda y «Quedan N» por producto; el carrito guardado solo trae nombre,
 * precio, cantidad e imagen, así que el detalle es la cantidad.
 */
@Component
class RecuperacionCarritoEmailBuilder {

    static final String ASUNTO = "Tus productos te esperan en HotClick";

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
                cantidad + (cantidad == 1 ? " unidad" : " unidades"),
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
            + layout.footer("¿Dudas?");
    }
}
