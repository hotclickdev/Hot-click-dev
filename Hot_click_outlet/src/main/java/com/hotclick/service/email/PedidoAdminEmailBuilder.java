package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Templates de email de pedidos al emprendedor y admin IT.
 * Extraído bit-idéntico de PedidoEmailBuilder — no cambia comportamiento.
 */
@Component
class PedidoAdminEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    String buildNuevoPedidoEmprendedor(Pedido pedido) {
        String nombreEmpresa = pedido.getEmpresa() != null
            ? (pedido.getEmpresa().getNombreComercial() != null
                ? pedido.getEmpresa().getNombreComercial()
                : pedido.getEmpresa().getNombreEmpresa())
            : "tu tienda";

        StringBuilder rows = new StringBuilder();
        if (pedido.getItems() != null) {
            for (PedidoItem item : pedido.getItems()) {
                String prod = item.getProducto() != null ? layout.esc(item.getProducto().getNombreProducto()) : "Producto";
                rows.append("<tr>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;font-size:13px;color:#14171C'>").append(prod).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:center;font-size:13px;color:#4D5560'>×").append(item.getCantidad()).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-size:13px;font-weight:700;color:#14171C'>₡").append(EmailLayoutHelper.CRC.format(item.getSubtotalItem())).append("</td>")
                    .append("</tr>");
            }
        }

        String cliente = pedido.getUsuarioFinal() != null
            ? layout.esc(pedido.getUsuarioFinal().getNombre() + " — " + pedido.getUsuarioFinal().getCorreo())
            : "Invitado";

        String notasStr = pedido.getNotas() != null && !pedido.getNotas().isBlank()
            ? "<div style='background:#FDF3DC;border:1px solid #EBD9A8;border-radius:10px;padding:12px 16px;margin-bottom:20px'>"
                + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#9A6700;text-transform:uppercase'>Notas del cliente</p>"
                + "<p style='margin:0;font-size:13px;color:#14171C'>" + layout.esc(pedido.getNotas()) + "</p>"
                + "</div>"
            : "";

        return layout.abrirHtml()
            + layout.header("Nueva venta en " + layout.esc(nombreEmpresa), "Pedido " + layout.esc(pedido.getNumeroPedido()))
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 20px;color:#4D5560;font-size:14px'>Recibiste un nuevo pedido. Aquí está el resumen:</p>"

            + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:14px 18px;margin-bottom:20px'>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:6px'>"
            + "<span style='color:#4D5560;font-size:13px'>Pedido</span>"
            + "<span style=\"color:#14171C;font-weight:700;font-family:'IBM Plex Mono',monospace\">" + layout.esc(pedido.getNumeroPedido()) + "</span>"
            + "</div>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:6px'>"
            + "<span style='color:#4D5560;font-size:13px'>Cliente</span>"
            + "<span style='color:#14171C;font-size:13px'>" + cliente + "</span>"
            + "</div>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:6px'>"
            + "<span style='color:#4D5560;font-size:13px'>Método de pago</span>"
            + "<span style='color:#14171C;font-size:13px'>" + layout.esc(pedido.getMetodoPago() != null ? pedido.getMetodoPago() : "—") + "</span>"
            + "</div>"
            + "<div style='display:flex;justify-content:space-between'>"
            + "<span style='color:#4D5560;font-size:13px'>Método de envío</span>"
            + "<span style='color:#14171C;font-size:13px'>" + layout.esc(pedido.getMetodoEnvio() != null ? pedido.getMetodoEnvio() : "—") + "</span>"
            + "</div>"
            + "</div>"

            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<thead><tr style='border-bottom:2px solid #E4E7EC'>"
            + "<th style='padding:8px 0;text-align:left;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Producto</th>"
            + "<th style='padding:8px 0;text-align:center;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase'>Cant.</th>"
            + "<th style='padding:8px 0;text-align:right;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Subtotal</th>"
            + "</tr></thead><tbody>" + rows + "</tbody></table>"

            + "<div style='background:#F8F9FB;border-radius:10px;padding:14px 18px;text-align:right;margin-bottom:20px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:18px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">Total: ₡" + EmailLayoutHelper.CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"

            + notasStr
            + layout.cta("https://hotclick.lat/admin/pedidos", "Ver pedido en el panel")
            + layout.footer("¿Tenés alguna pregunta sobre este pedido?");
    }

    String buildNuevoPedidoAdminIT(Pedido pedido) {
        String nombreEmpresa = pedido.getEmpresa() != null
            ? (pedido.getEmpresa().getNombreComercial() != null
                ? pedido.getEmpresa().getNombreComercial()
                : pedido.getEmpresa().getNombreEmpresa())
            : "HotClick";

        String cliente = pedido.getUsuarioFinal() != null
            ? layout.esc(pedido.getUsuarioFinal().getNombre()
                + " &lt;" + pedido.getUsuarioFinal().getCorreo() + "&gt;"
                + (pedido.getUsuarioFinal().getTelefono() != null ? " · " + pedido.getUsuarioFinal().getTelefono() : ""))
            : "Invitado";

        StringBuilder rows = new StringBuilder();
        if (pedido.getItems() != null) {
            for (PedidoItem item : pedido.getItems()) {
                String prod = item.getProducto() != null ? layout.esc(item.getProducto().getNombreProducto()) : "Producto";
                rows.append("<tr>")
                    .append("<td style='padding:6px 0;border-bottom:1px solid #E4E7EC;font-size:12px;color:#14171C'>").append(prod).append("</td>")
                    .append("<td style='padding:6px 0;border-bottom:1px solid #E4E7EC;text-align:center;font-size:12px;color:#4D5560'>×").append(item.getCantidad()).append("</td>")
                    .append("<td style='padding:6px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-size:12px;font-weight:700;color:#14171C'>₡").append(EmailLayoutHelper.CRC.format(item.getSubtotalItem())).append("</td>")
                    .append("</tr>");
            }
        }

        return layout.abrirHtml()
            + layout.header("[ADMIN] Nuevo pedido", layout.esc(pedido.getNumeroPedido()) + " · " + layout.esc(nombreEmpresa))
            + layout.abrirCuerpo()
            + "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:13px'>"
            + "<div style='margin-bottom:6px'><strong>Pedido:</strong> <span style=\"font-family:'IBM Plex Mono',monospace\">" + layout.esc(pedido.getNumeroPedido()) + "</span></div>"
            + "<div style='margin-bottom:6px'><strong>Empresa:</strong> " + layout.esc(nombreEmpresa) + "</div>"
            + "<div style='margin-bottom:6px'><strong>Cliente:</strong> " + cliente + "</div>"
            + "<div style='margin-bottom:6px'><strong>Método de pago:</strong> " + layout.esc(pedido.getMetodoPago() != null ? pedido.getMetodoPago() : "—") + "</div>"
            + "<div style='margin-bottom:6px'><strong>Método de envío:</strong> " + layout.esc(pedido.getMetodoEnvio() != null ? pedido.getMetodoEnvio() : "—") + "</div>"
            + "<div><strong>Estado:</strong> " + layout.esc(pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "—") + "</div>"
            + "</div>"
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + rows + "</tbody></table>"
            + "<div style='background:#F8F9FB;border-radius:10px;padding:12px 16px;text-align:right;margin-bottom:20px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + EmailLayoutHelper.F_DISPLAY + "\">Total: ₡" + EmailLayoutHelper.CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + (pedido.getNotas() != null && !pedido.getNotas().isBlank()
                ? "<p style='font-size:12px;color:#4D5560;margin:0 0 20px'><strong>Notas:</strong> " + layout.esc(pedido.getNotas()) + "</p>"
                : "")
            + layout.cta("https://hotclick.lat/admin/pedidos", "Gestionar pedido")
            + layout.footer("Notificación automática del sistema HotClick.");
    }
}
