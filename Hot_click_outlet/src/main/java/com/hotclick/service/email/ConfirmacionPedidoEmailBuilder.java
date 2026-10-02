package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de confirmación de pedido al cliente (Figma «Correo · Confirmación de pedido», 30:1599).
 */
@Component
class ConfirmacionPedidoEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    /** Asunto del correo: «Recibimos tu pedido #1048». */
    String asunto(Pedido pedido) {
        return "Recibimos tu pedido #" + pedido.getNumeroPedido();
    }

    String buildConfirmacionPedido(Pedido pedido, Usuario cliente) {
        StringBuilder filas = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            String nombre = item.getProducto() != null ? layout.esc(item.getProducto().getNombreProducto()) : "Producto";
            String imgUrl = item.getProducto() != null ? item.getProducto().getImagenPrincipalUrl() : null;
            int cantidad = item.getCantidad() != null ? item.getCantidad() : 1;
            String unidades = cantidad + (cantidad == 1 ? " unidad" : " unidades");
            String tienda = nombreTienda(pedido, item);
            String detalle = tienda.isEmpty() ? unidades : layout.esc(tienda) + " · " + unidades;
            filas.append(layout.filaProducto(imgUrl, nombre, detalle, layout.monto(item.getSubtotalItem())));
        }

        boolean esEnvio = "ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());
        String entrega = esEnvio
            ? "Envío a domicilio. Vas a recibir tu pedido en la dirección indicada."
            : "Retiro en tienda. Tu pedido va a estar listo para retirar en nuestra tienda.";

        StringBuilder montos = new StringBuilder();
        montos.append(layout.filaMonto("Productos", layout.monto(pedido.getSubtotal()), false));
        if (esEnvio) {
            montos.append(layout.filaMonto("Envío", layout.monto(pedido.getCostoEnvio()), false));
        }
        montos.append(layout.filaMonto("Total pagado", layout.monto(pedido.getTotalPedido()), true));

        String nombreCliente = primerNombre(cliente.getNombre());
        String saludo = nombreCliente.isEmpty() ? "¡Gracias por tu compra!" : "¡Gracias por tu compra, " + layout.esc(nombreCliente) + "!";

        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_EXITO, "check", saludo,
                "Recibimos tu pedido #" + layout.esc(pedido.getNumeroPedido()) + ". Te avisamos por correo cuando salga.")
            + layout.abrirCuerpo()
            + layout.caja(filas.toString())
            + layout.tablaMontos(montos.toString())
            + "<p style=\"margin:0 0 18px;color:#4D5560;font-size:14px;line-height:20px\">" + entrega + "</p>"
            + layout.cta(layout.urlSeguimiento(pedido), "Ver mi pedido")
            + layout.notaPequena("Garantía de 40 días activa: si tenés cualquier problema con tu pedido, escribinos por WhatsApp y lo resolvemos.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }

    private String nombreTienda(Pedido pedido, PedidoItem item) {
        if (item.getProducto() != null && item.getProducto().getEmpresaNombre() != null
                && !item.getProducto().getEmpresaNombre().isBlank()) {
            return item.getProducto().getEmpresaNombre();
        }
        if (pedido.getEmpresa() != null && pedido.getEmpresa().getNombreComercial() != null) {
            return pedido.getEmpresa().getNombreComercial();
        }
        return "";
    }

    private String primerNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) return "";
        return nombre.trim().split("\\s+")[0];
    }
}
