package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Templates de email transaccional al cliente (pedidos y carrito).
 * Extraído bit-idéntico de PedidoEmailBuilder — no cambia comportamiento.
 */
@Component
class PedidoClienteEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    String buildConfirmacionPedido(Pedido pedido, Usuario cliente) {
        StringBuilder itemRows = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            String nombre = item.getProducto() != null ? layout.esc(item.getProducto().getNombreProducto()) : "Producto";
            String imgUrl = item.getProducto() != null ? item.getProducto().getImagenPrincipalUrl() : null;
            String imgTag = (imgUrl != null && !imgUrl.isBlank())
                ? "<img src='" + layout.esc(imgUrl) + "' width='52' height='52' style='object-fit:cover;border-radius:8px;display:block;border:1px solid #E4E7EC' alt=''>"
                : "<div style='width:52px;height:52px;border-radius:8px;background:#F1F3F6'></div>";
            itemRows.append("<tr>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #F1F3F6;vertical-align:middle'>")
                .append("<table cellpadding='0' cellspacing='0' style='border-collapse:collapse'><tr>")
                .append("<td style='padding-right:12px;vertical-align:middle'>").append(imgTag).append("</td>")
                .append("<td style='vertical-align:middle'><span style='font-size:13px;color:#14171C;font-weight:500;display:block'>").append(nombre).append("</span>")
                .append("<span style='font-size:11px;color:#9AA1AE;margin-top:2px;display:block'>Cantidad: ×").append(item.getCantidad()).append("</span></td>")
                .append("</tr></table></td>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #F1F3F6;text-align:right;vertical-align:middle;white-space:nowrap'>")
                .append("<span style=\"font-size:14px;font-weight:700;color:#14171C;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">₡").append(EmailLayoutHelper.CRC.format(item.getSubtotalItem())).append("</span></td>")
                .append("</tr>");
        }

        boolean esEnvio = "ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());
        String metodoEnvioLabel = esEnvio ? "Envío a domicilio" : "Retiro en tienda";
        String metodoEnvioSub = esEnvio
            ? "Vas a recibir tu pedido en la dirección indicada"
            : "Tu pedido va a estar listo para retirar en nuestra tienda";

        String nombreCliente = layout.esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");

        return layout.abrirHtml()
            + layout.header("¡Listo! Pedido confirmado", "Tu pago se procesó sin problemas")
            + layout.abrirCuerpo()

            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombreCliente + "</strong>.</p>"
            + "<p style='margin:0 0 28px;color:#4D5560;font-size:14px;line-height:1.6'>Gracias por tu compra. Este es el resumen de tu pedido:</p>"

            // Número de pedido (datos en mono, cap. 4.1)
            + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 2px;font-size:11px;color:#1747A8;font-weight:700;text-transform:uppercase;letter-spacing:1px'>Número de pedido</p>"
            + "<p style=\"margin:0;font-size:16px;font-weight:800;color:#14171C;font-family:'IBM Plex Mono',monospace\">" + layout.esc(pedido.getNumeroPedido()) + "</p>"
            + "</div>"

            // Items
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:24px'>"
            + "<thead><tr style='border-bottom:2px solid #E4E7EC'>"
            + "<th style='padding:10px 8px;text-align:left;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Producto</th>"
            + "<th style='padding:10px 8px;text-align:right;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Total</th>"
            + "</tr></thead>"
            + "<tbody>" + itemRows + "</tbody>"
            + "</table>"

            // Totales
            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;margin-bottom:24px'>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#4D5560;font-size:13px'>Subtotal</span>"
            + "<span style='color:#14171C;font-size:13px'>₡" + EmailLayoutHelper.CRC.format(pedido.getSubtotal()) + "</span>"
            + "</div>"
            + (esEnvio ? "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#4D5560;font-size:13px'>Envío</span>"
            + "<span style='color:#14171C;font-size:13px'>₡" + EmailLayoutHelper.CRC.format(pedido.getCostoEnvio()) + "</span>"
            + "</div>" : "")
            + "<div style='display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #E4E7EC;margin-top:4px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">Total pagado</span>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:18px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">₡" + EmailLayoutHelper.CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div></div>"

            // Método de entrega
            + "<div style='border:1px solid #E4E7EC;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#14171C'>" + metodoEnvioLabel + "</p>"
            + "<p style='margin:0;font-size:13px;color:#4D5560'>" + metodoEnvioSub + "</p>"
            + "</div>"

            // Garantía / confianza
            + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#178A50'>Garantía de 40 días activa</p>"
            + "<p style='margin:0;font-size:13px;color:#14171C'>Si tenés cualquier problema con tu pedido, escribinos por WhatsApp y lo resolvemos.</p>"
            + "</div>"

            + layout.cta("https://hotclick.lat/mis-pedidos", "Ver mi pedido")
            + layout.footer("¿Tenés alguna pregunta sobre tu pedido?");
    }

    String buildNotificacionGuia(Pedido pedido, Usuario cliente) {
        String nombre = layout.esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String guia   = layout.esc(pedido.getNumeroGuia());
        boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
        String url    = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
            : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
        String courierNombre = isCorreos ? "Correos de Costa Rica" : "HotClick Express";

        return layout.abrirHtml()
            + layout.header("Tu pedido va en camino", "Ya salió de nuestras manos hacia las tuyas")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 28px;color:#4D5560;font-size:14px;line-height:1.6'>Tu pedido <strong style='color:#14171C'>" + layout.esc(pedido.getNumeroPedido()) + "</strong> fue enviado con <strong>" + courierNombre + "</strong>.</p>"

            // Número de guía en mono (cap. 4.1: datos en IBM Plex Mono)
            + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px'>"
            + "<p style='margin:0 0 8px;font-size:12px;color:#178A50;font-weight:700;text-transform:uppercase;letter-spacing:2px'>Número de guía</p>"
            + "<p style=\"margin:0 0 20px;font-size:28px;font-weight:800;color:#14171C;letter-spacing:3px;font-family:'IBM Plex Mono',monospace\">" + guia + "</p>"
            + "<a href='" + layout.esc(url) + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700'>Rastrear mi paquete</a>"
            + "</div>"

            + "<div style='border:1px solid #EBD9A8;background:#FDF3DC;border-radius:12px;padding:14px 18px;margin-bottom:8px'>"
            + "<p style='margin:0;font-size:13px;color:#9A6700;line-height:1.6'><strong>Dato útil:</strong> también podés rastrear en "
            + (isCorreos ? "<strong>rastreo.correos.go.cr</strong> ingresando tu número de guía." : "el enlace de arriba.")
            + " La entrega tarda de 2 a 5 días hábiles.</p>"
            + "</div>"
            + layout.footer("¿Alguna pregunta sobre tu envío?");
    }

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

    String buildPagoFallido(Pedido pedido, Usuario cliente, String motivo) {
        String nombre = layout.esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        return layout.abrirHtml()
            + layout.header("No pudimos procesar tu pago", "Tu carrito sigue guardado")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>El pago de tu pedido <strong style='color:#14171C'>" + layout.esc(pedido.getNumeroPedido()) + "</strong> no se pudo completar. No se hizo ningún cargo.</p>"

            // Alerta de error: fondo semántico 50 + texto 600 (cap. 3.5)
            + "<div style='background:#FEF2F1;border:1px solid #FBC1BD;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#D02A23;text-transform:uppercase;letter-spacing:1px'>Qué pasó</p>"
            + "<p style='margin:0;font-size:14px;color:#76211E'>" + layout.esc(motivo != null ? motivo : "El pago fue rechazado o cancelado por el procesador.") + "</p>"
            + "</div>"

            + "<p style='margin:0 0 20px;color:#4D5560;font-size:14px;line-height:1.6'>El stock fue liberado y podés intentarlo de nuevo cuando querás — revisá los datos del método de pago o probá con otro. Si el problema sigue, escribinos por WhatsApp y lo vemos juntos.</p>"

            + layout.cta("https://hotclick.lat/checkout", "Intentar de nuevo")
            + layout.footer("¿Necesitás ayuda con tu pago?");
    }

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
