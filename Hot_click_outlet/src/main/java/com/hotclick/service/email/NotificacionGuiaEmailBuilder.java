package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de guía asignada al cliente (Figma «Correo · Guía asignada», 30:1643).
 * «Paquete N de M» y «Los otros paquetes…» de Figma necesitan los pedidos hermanos
 * del mismo pago (grupoPago): este builder solo conoce un pedido y no los inventa.
 */
@Component
class NotificacionGuiaEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    /** Asunto del correo: «Tu pedido #1042 va en camino». */
    String asunto(Pedido pedido) {
        return "Tu pedido #" + pedido.getNumeroPedido() + " va en camino";
    }

    String buildNotificacionGuia(Pedido pedido, Usuario cliente) {
        String guia   = layout.esc(pedido.getNumeroGuia());
        boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
        String url    = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
            : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
        String courierNombre = isCorreos ? "Correos de Costa Rica" : "HotClick Express";
        String tienda = pedido.getEmpresa() != null && pedido.getEmpresa().getNombreComercial() != null
            ? pedido.getEmpresa().getNombreComercial() : "";

        String titulo = tienda.isEmpty() ? "Tu pedido va en camino" : layout.esc(tienda) + " despachó tu paquete";
        String sub = "Tu pedido #" + layout.esc(pedido.getNumeroPedido()) + " salió con " + courierNombre
            + ". La entrega tarda de 2 a 5 días hábiles.";

        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_INFO, "camion", titulo, sub)
            + layout.abrirCuerpo()
            + layout.codigoDestacado("Número de guía", guia, "#F8F9FB", true)
            + layout.ctaAzul(url, isCorreos ? "Seguir mi paquete en Correos CR" : "Rastrear mi paquete")
            + (isCorreos
                ? layout.notaPequena("Si no estás en casa, Correos deja un aviso y lo podés retirar en la sucursal más cercana. "
                    + "También podés rastrear en rastreo.correos.go.cr con tu número de guía.")
                : "")
            + layout.enlaceSecundario(layout.urlSeguimiento(pedido), "Ver el estado de todo mi pedido")
            + layout.footer("¿Dudas?");
    }
}
