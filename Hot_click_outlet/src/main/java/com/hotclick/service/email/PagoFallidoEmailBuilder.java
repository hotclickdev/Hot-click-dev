package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Template de pago fallido al cliente.
 * Extraído bit-idéntico de PedidoClienteEmailBuilder — no cambia comportamiento.
 */
@Component
class PagoFallidoEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

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
}
