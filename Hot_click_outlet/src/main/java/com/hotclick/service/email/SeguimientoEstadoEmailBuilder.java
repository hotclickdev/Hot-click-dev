package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Template de seguimiento de estado de pedido al cliente.
 * Extraído bit-idéntico de PedidoClienteEmailBuilder — no cambia comportamiento.
 */
@Component
class SeguimientoEstadoEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    String buildSeguimientoEstado(Pedido pedido, Usuario cliente, String nota) {
        String nombre  = layout.esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String estado  = layout.esc(pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "—");
        boolean esRetiro = !"ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());

        StringBuilder items = new StringBuilder();
        if (pedido.getItems() != null) {
            for (PedidoItem item : pedido.getItems()) {
                String prod = item.getProducto() != null ? item.getProducto().getNombreProducto() : "Producto";
                items.append("<tr>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;font-size:13px;color:#14171C'>").append(layout.esc(prod)).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:center;font-size:13px;color:#4D5560'>×").append(item.getCantidad()).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-size:13px;color:#14171C'>₡").append(EmailLayoutHelper.CRC.format(item.getSubtotalItem())).append("</td>")
                    .append("</tr>");
            }
        }

        String guiaSection = "";
        if (pedido.getNumeroGuia() != null && !pedido.getNumeroGuia().isBlank()) {
            boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
            String url = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
                : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
            String courierLabel = isCorreos ? "Correos de Costa Rica" : "Entrega directa por HotClick";
            guiaSection = "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#178A50;font-weight:700;text-transform:uppercase;letter-spacing:1px'>Envío · " + layout.esc(courierLabel) + "</p>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#4D5560'>Número de guía</p>"
                + "<p style=\"margin:0 0 12px;font-size:20px;font-weight:800;color:#14171C;letter-spacing:2px;font-family:'IBM Plex Mono',monospace\">" + layout.esc(pedido.getNumeroGuia()) + "</p>"
                + "<a href='" + url + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;padding:9px 22px;border-radius:10px;font-size:13px;font-weight:700'>Rastrear paquete</a>"
                + "</div>";
        }

        String retiroSection = "";
        if (esRetiro && ("LISTO_RETIRO".equals(pedido.getEstadoPedido()) || "EN_PREPARACION".equals(pedido.getEstadoPedido()))) {
            retiroSection = "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 8px;font-size:14px;color:#14171C;font-weight:700'>Retiro en tienda</p>"
                + "<p style='margin:0 0 12px;font-size:13px;color:#4D5560'>HotClick · Centro Comercial · Costa Rica</p>"
                + "<a href='https://waze.com/ul?ll=9.9342,-84.0877&navigate=yes' style='display:inline-block;border:1px solid #1747A8;color:#1747A8;text-decoration:none;padding:8px 20px;border-radius:10px;font-size:13px;font-weight:700'>Cómo llegar (Waze)</a>"
                + "</div>";
        }

        String notaSection = (nota != null && !nota.isBlank())
            ? "<div style='background:#FDF3DC;border:1px solid #EBD9A8;border-radius:12px;padding:14px 18px;margin-bottom:20px'>"
                + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#9A6700;text-transform:uppercase;letter-spacing:1px'>Mensaje de HotClick</p>"
                + "<p style='margin:0;font-size:14px;color:#14171C'>" + layout.esc(nota) + "</p>"
                + "</div>"
            : "";

        // Estados con los colores semánticos del cap. 3.3 / 6.2
        String estadoColor;
        switch (pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "") {
            case "PAGADO":         estadoColor = "#1747A8"; break;
            case "EN_PREPARACION": estadoColor = "#9A6700"; break;
            case "LISTO_RETIRO":   estadoColor = "#1747A8"; break;
            case "ENVIADO":        estadoColor = "#178A50"; break;
            case "ENTREGADO":      estadoColor = "#178A50"; break;
            case "CANCELADO":      estadoColor = "#D02A23"; break;
            default:               estadoColor = "#6E7682";
        }

        return layout.abrirHtml()
            + layout.header("Actualización de tu pedido", "Tenemos novedades para vos")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Esta es la información actualizada de tu pedido <strong style='color:#14171C'>" + layout.esc(pedido.getNumeroPedido()) + "</strong>.</p>"

            // Badge de estado: punto de color + texto (cap. 6.2)
            + "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:16px 20px;margin-bottom:20px'>"
            + "<p style='margin:0 0 2px;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Estado actual</p>"
            + "<p style='margin:0;font-size:16px;font-weight:800;color:" + estadoColor + "'>&#9679; " + estado + "</p>"
            + "</div>"

            + notaSection
            + guiaSection
            + retiroSection

            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + items + "</tbody>"
            + "</table>"

            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;text-align:right'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">Total: ₡" + EmailLayoutHelper.CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + layout.footer("¿Tenés alguna pregunta?");
    }
}
