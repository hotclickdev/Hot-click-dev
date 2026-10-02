package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de seguimiento de estado al cliente (Figma «Correo · Seguimiento de estado», 30:1669).
 * Figma solo dibuja «En preparación»; el resto de estados reutiliza la misma estructura sin
 * inventar piezas nuevas (los pasos solo aparecen en los estados que Figma nombra).
 */
@Component
class SeguimientoEstadoEmailBuilder {

    private static final String[] PASOS = {"Pagado", "En preparación", "Enviado", "Entregado"};

    @Autowired private EmailLayoutHelper layout;

    /** Asunto del correo: «Tu pedido #1048 está en preparación». */
    String asunto(Pedido pedido) {
        return "Tu pedido #" + pedido.getNumeroPedido() + " " + frase(pedido.getEstadoPedido());
    }

    String buildSeguimientoEstado(Pedido pedido, Usuario cliente, String nota) {
        String estado = pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "";
        boolean esRetiro = !"ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());
        String tienda = pedido.getEmpresa() != null && pedido.getEmpresa().getNombreComercial() != null
            ? pedido.getEmpresa().getNombreComercial() : "";

        String titulo = switch (estado) {
            case "PAGADO"         -> "Tu pedido está pagado";
            case "EN_PREPARACION" -> "Tu pedido está en preparación";
            case "ENVIADO"        -> "Tu pedido fue enviado";
            case "ENTREGADO"      -> "Tu pedido fue entregado";
            case "LISTO_RETIRO"   -> "Tu pedido está listo para retirar";
            case "CANCELADO"      -> "Tu pedido fue cancelado";
            default               -> "Actualización de tu pedido";
        };
        String sub = "EN_PREPARACION".equals(estado) && !tienda.isEmpty()
            ? layout.esc(tienda) + " ya lo está alistando."
            : "Esta es la información actualizada de tu pedido #" + layout.esc(pedido.getNumeroPedido()) + ".";

        String fondo;
        String icono;
        switch (estado) {
            case "EN_PREPARACION" -> { fondo = EmailLayoutHelper.FONDO_AVISO;  icono = "caja"; }
            case "ENVIADO"        -> { fondo = EmailLayoutHelper.FONDO_INFO;   icono = "camion"; }
            case "PAGADO", "ENTREGADO" -> { fondo = EmailLayoutHelper.FONDO_EXITO; icono = "check"; }
            case "CANCELADO"      -> { fondo = EmailLayoutHelper.FONDO_ALERTA; icono = "alerta"; }
            default               -> { fondo = EmailLayoutHelper.FONDO_INFO;   icono = "caja"; }
        }

        int paso = switch (estado) {
            case "PAGADO" -> 0;
            case "EN_PREPARACION" -> 1;
            case "ENVIADO" -> 2;
            case "ENTREGADO" -> 3;
            default -> -1;
        };

        StringBuilder cuerpo = new StringBuilder();
        if (paso >= 0 && !(esRetiro && !"EN_PREPARACION".equals(estado) && !"PAGADO".equals(estado))) {
            cuerpo.append(layout.pasosEstado(PASOS, paso));
        }

        if (nota != null && !nota.isBlank()) {
            String quien = tienda.isEmpty() ? "Mensaje de HotClick" : "Mensaje de la tienda";
            cuerpo.append(layout.notaConTitulo(EmailLayoutHelper.FONDO_INFO, EmailLayoutHelper.AZUL, quien, "“" + layout.esc(nota) + "”", EmailLayoutHelper.TEXTO, "14px"));
        }

        if (pedido.getNumeroGuia() != null && !pedido.getNumeroGuia().isBlank()) {
            String url = layout.urlRastreo(pedido);
            String courier = layout.esRastreoCorreos(pedido) ? "Correos de Costa Rica" : "Entrega directa por HotClick";
            cuerpo.append(layout.codigoDestacado("Número de guía · " + layout.esc(courier), layout.esc(pedido.getNumeroGuia()), EmailLayoutHelper.FONDO_SUAVE, true))
                .append(layout.ctaAzul(url, "Rastrear mi paquete"));
        }

        if (esRetiro && ("LISTO_RETIRO".equals(estado) || "EN_PREPARACION".equals(estado))) {
            cuerpo.append(layout.notaAzul("caja-azul",
                "Retiro en tienda: HotClick · Centro Comercial · Costa Rica. "
                + "<a href=\"https://waze.com/ul?ll=9.9342,-84.0877&amp;navigate=yes\" style=\"color:#1747A8;font-weight:700\">Cómo llegar (Waze)</a>"));
        }

        return layout.abrirHtml()
            + layout.headerConIcono(fondo, icono, titulo, sub)
            + layout.abrirCuerpo()
            + cuerpo
            + layout.cta(layout.urlSeguimiento(pedido), "Ver mi pedido")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }

    private String frase(String estado) {
        return switch (estado != null ? estado : "") {
            case "PAGADO"         -> "está pagado";
            case "EN_PREPARACION" -> "está en preparación";
            case "ENVIADO"        -> "fue enviado";
            case "ENTREGADO"      -> "fue entregado";
            case "LISTO_RETIRO"   -> "está listo para retirar";
            case "CANCELADO"      -> "fue cancelado";
            default               -> "tiene novedades";
        };
    }
}
