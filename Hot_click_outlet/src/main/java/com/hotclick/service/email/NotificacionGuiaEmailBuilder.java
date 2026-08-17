package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Template de notificación de guía de envío al cliente.
 * Extraído bit-idéntico de PedidoClienteEmailBuilder — no cambia comportamiento.
 */
@Component
class NotificacionGuiaEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

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
}
