package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Correo de pago fallido al cliente (Figma «Correo · Pago fallido», 30:1708).
 */
@Component
class PagoFallidoEmailBuilder {

    private static final String MOTIVO_POR_DEFECTO = "El pago fue rechazado o cancelado por el procesador.";

    @Autowired private EmailLayoutHelper layout;

    /** Asunto del correo: «No pudimos procesar el pago de tu pedido #1052». */
    String asunto(Pedido pedido) {
        return "No pudimos procesar el pago de tu pedido #" + pedido.getNumeroPedido();
    }

    String buildPagoFallido(Pedido pedido, Usuario cliente, String motivo) {
        String motivoTexto = layout.esc(motivo != null && !motivo.isBlank() ? motivo : MOTIVO_POR_DEFECTO);
        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_ALERTA, "alerta", "No pudimos procesar tu pago",
                "Tu pedido #" + layout.esc(pedido.getNumeroPedido()) + " no se completó. No se hizo ningún cobro.")
            + layout.abrirCuerpo()
            + layout.notaConTitulo(EmailLayoutHelper.FONDO_SUAVE, EmailLayoutHelper.TEXTO_SUAVE, "Motivo", motivoTexto, EmailLayoutHelper.TEXTO, "15px")
            + layout.cta(layout.urlSitio("/checkout"), "Intentar de nuevo")
            + layout.notaPequena("También podés pagar con SINPE Móvil desde la misma página. "
                + "Si el problema sigue, escribinos por WhatsApp y lo vemos juntos.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }
}
