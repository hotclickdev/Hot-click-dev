package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Template de confirmación de pedido al cliente.
 * Extraído bit-idéntico de PedidoClienteEmailBuilder — no cambia comportamiento.
 */
@Component
class ConfirmacionPedidoEmailBuilder {

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
}
