package com.hotclick.service.email;

import com.hotclick.config.TiemposEnvio;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de guía asignada al cliente (Figma «Correo · Guía asignada», 30:1643).
 * «Paquete N de M» y «Los otros paquetes…» salen de los pedidos hermanos del mismo
 * pago ({@code grupoPago}); con un solo paquete no se dibujan. El plazo sale de
 * {@link TiemposEnvio} (la misma config que el checkout).
 */
@Component
class NotificacionGuiaEmailBuilder {

    @Autowired private EmailLayoutHelper layout;
    @Autowired(required = false) private PedidoRepository pedidoRepository;

    /** Asunto del correo: «Tu pedido #1042 va en camino». */
    String asunto(Pedido pedido) {
        return "Tu pedido #" + pedido.getNumeroPedido() + " va en camino";
    }

    String buildNotificacionGuia(Pedido pedido, Usuario cliente) {
        String guia   = layout.esc(pedido.getNumeroGuia());
        boolean isCorreos = layout.esRastreoCorreos(pedido);
        String url    = layout.urlRastreo(pedido);
        String courierNombre = isCorreos ? "Correos de Costa Rica" : "HotClick Express";
        String tienda = pedido.getEmpresa() != null && pedido.getEmpresa().getNombreComercial() != null
            ? pedido.getEmpresa().getNombreComercial() : "";

        String titulo = tienda.isEmpty() ? "Tu pedido va en camino" : layout.esc(tienda) + " despachó tu paquete";
        int[] paquete = paqueteDelGrupo(pedido);
        String prefijo = paquete == null ? "" : "Paquete " + paquete[0] + " de " + paquete[1] + ". ";
        String sub = prefijo + "Tu pedido #" + layout.esc(pedido.getNumeroPedido()) + " salió con " + courierNombre
            + ". La entrega tarda " + TiemposEnvio.plazo(pedido.getMetodoEnvio()) + ".";

        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_INFO, "camion", titulo, sub)
            + layout.abrirCuerpo()
            + layout.codigoDestacado("Número de guía", guia, EmailLayoutHelper.FONDO_SUAVE, true)
            + layout.ctaAzul(url, isCorreos ? "Seguir mi paquete en Correos CR" : "Rastrear mi paquete")
            + (isCorreos
                ? layout.notaPequena("Si no estás en casa, Correos deja un aviso y lo podés retirar en la sucursal más cercana. "
                    + "También podés rastrear en rastreo.correos.go.cr con tu número de guía.")
                : "")
            + (paquete == null ? ""
                : layout.notaPequena("Los otros paquetes de tu compra salen por separado: te avisamos cuando cada uno vaya en camino."))
            + layout.enlaceSecundario(layout.urlSeguimiento(pedido), "Ver el estado de todo mi pedido")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }

    /** {N, M} si el pedido es uno de varios paquetes del mismo pago; null si va solo. */
    int[] paqueteDelGrupo(Pedido pedido) {
        String grupo = pedido.getGrupoPago();
        if (grupo == null || grupo.isBlank() || pedidoRepository == null || pedido.getId() == null) return null;
        java.util.List<Pedido> hermanos = pedidoRepository.findByGrupoPagoOrderByIdAsc(grupo);
        if (hermanos.size() < 2) return null;
        for (int i = 0; i < hermanos.size(); i++) {
            if (pedido.getId().equals(hermanos.get(i).getId())) return new int[] {i + 1, hermanos.size()};
        }
        return null;
    }
}
