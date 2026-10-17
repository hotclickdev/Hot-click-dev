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
            String detalle = layout.detalleUnidades(nombreTienda(pedido, item), cantidad);
            filas.append(layout.filaProducto(imgUrl, nombre, detalle, layout.monto(item.getSubtotalItem())));
        }

        boolean esEnvio = !MetodoEnvioTexto.esRetiro(pedido.getMetodoEnvio());
        String entrega = textoEntrega(pedido, esEnvio);

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
            + avisoCuentaRegistrada(cliente)
            + layout.notaPequena("Garantía de 40 días activa: si tenés cualquier problema con tu pedido, escribinos por WhatsApp y lo resolvemos.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }

    /**
     * S4-19: si el correo del pedido ya es de una cuenta real (no un invitado GUEST-), el aviso de iniciar
     * sesión va solo dentro de este correo, que recibe el dueño de la casilla. La respuesta del checkout es
     * la misma con o sin cuenta, así un tercero no averigua si el correo existe.
     */
    String avisoCuentaRegistrada(Usuario cliente) {
        if (!esCuentaRegistrada(cliente)) return "";
        return layout.enlaceSecundario(layout.urlSitio("/login?redirect=%2Fmis-pedidos"),
                "Este correo ya tiene cuenta en HotClick: iniciá sesión para ver esta compra en «Mis pedidos»");
    }

    static boolean esCuentaRegistrada(Usuario cliente) {
        if (cliente == null) return false;
        String id = cliente.getIdentificacion();
        return id != null && !id.isBlank() && !id.startsWith("GUEST-");
    }

    /** «Envío normal GAM. Enviamos a …» con la dirección guardada en el pedido (V148). */
    private String textoEntrega(Pedido pedido, boolean esEnvio) {
        if (!esEnvio) {
            return "Retiro en tienda. Tu pedido va a estar listo para retirar en nuestra tienda.";
        }
        String etiqueta = "<strong style=\"color:#14171C\">" + MetodoEnvioTexto.etiqueta(pedido.getMetodoEnvio()) + "</strong>";
        String direccion = pedido.getDireccionEntrega();
        if (direccion == null || direccion.isBlank()) {
            return etiqueta + ". Vas a recibir tu pedido en la dirección indicada.";
        }
        return etiqueta + ". Enviamos a " + layout.esc(direccion) + ".";
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
