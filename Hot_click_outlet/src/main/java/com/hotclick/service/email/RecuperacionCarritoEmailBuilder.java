package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Template de recuperación de carrito abandonado.
 * Extraído bit-idéntico de PedidoClienteEmailBuilder — no cambia comportamiento.
 */
@Component
class RecuperacionCarritoEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    String buildRecuperacionCarrito(
            Long carritoId,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {

        StringBuilder rows = new StringBuilder();
        int total = 0;
        for (CarritoAbandonadoRequestDTO.CartItemDTO item : items) {
            int subtotal = (item.getPrecio() != null ? item.getPrecio() : 0)
                         * (item.getCantidad() != null ? item.getCantidad() : 1);
            total += subtotal;
            String img = item.getImagenUrl() != null
                ? "<img src='" + layout.esc(item.getImagenUrl()) + "' width='48' height='48' style='object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:10px'>"
                : "";
            rows.append("<tr>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;color:#14171C'>")
                .append(img).append(layout.esc(item.getNombre())).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;text-align:center;color:#4D5560'>×")
                .append(item.getCantidad() != null ? item.getCantidad() : 1).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;text-align:right;font-weight:700;color:#14171C'>₡")
                .append(EmailLayoutHelper.CRC.format(subtotal)).append("</td>")
                .append("</tr>");
        }

        String recoverUrl = appUrl + "/recuperar-carrito/" + carritoId;

        return layout.abrirHtml()
            + layout.header("Tu carrito te espera", "Dejaste productos sin completar la compra")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Guardamos tu carrito tal cual lo dejaste. Completá la compra antes de que se agote el stock.</p>"
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + rows + "</tbody>"
            + "</table>"
            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;text-align:right;margin-bottom:28px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">Total estimado: ₡" + EmailLayoutHelper.CRC.format(total) + "</span>"
            + "</div>"
            + layout.cta(recoverUrl, "Recuperar mi carrito")
            + "<p style='margin:16px 0 0;color:#9AA1AE;font-size:11px;text-align:center'>Si ya no querés recordatorios, simplemente ignorá este mensaje.</p>"
            + layout.footer("¿Tenés alguna pregunta?");
    }
}
