package com.hotclick.service.pedido;

import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Aviso por Telegram al comprador cuando cambia el estado de su pedido. Solo si el comprador
 * vinculó su cuenta con el bot (vinculación ACTIVA) y el bot está configurado. Nunca falla el flujo.
 */
@Component
public class PedidoSeguimientoTelegram {

    private static final Logger log = LoggerFactory.getLogger(PedidoSeguimientoTelegram.class);

    static final Map<String, String> TEXTO_ESTADO = Map.ofEntries(
        Map.entry("PENDIENTE", "recibimos tu pedido"),
        Map.entry("PENDIENTE_COMPROBANTE", "estamos esperando el comprobante de pago"),
        Map.entry("PENDIENTE_APROBACION", "estamos revisando tu pago"),
        Map.entry("PAGADO", "tu pago fue confirmado"),
        Map.entry("EN_PREPARACION", "el negocio está preparando tu pedido"),
        Map.entry("LISTO_RETIRO", "tu pedido está listo para retirar"),
        Map.entry("ENVIADO", "tu pedido va en camino"),
        Map.entry("ENTREGADO", "tu pedido fue entregado"),
        Map.entry("COMPLETADO", "tu pedido se completó"),
        Map.entry("CANCELADO", "tu pedido fue cancelado"));

    private final TelegramVinculacionRepository vinculaciones;
    private final TelegramClienteBotService bot;

    public PedidoSeguimientoTelegram(TelegramVinculacionRepository vinculaciones, TelegramClienteBotService bot) {
        this.vinculaciones = vinculaciones;
        this.bot = bot;
    }

    public static String texto(Pedido pedido) {
        String estado = pedido.getEstadoPedido();
        String detalle = TEXTO_ESTADO.getOrDefault(estado, "su estado cambió a " + estado);
        return "Pedido " + pedido.getNumeroPedido() + ": " + detalle + ". Podés ver el detalle en hotclick.lat";
    }

    public void avisar(Pedido pedido) {
        try {
            if (pedido == null || pedido.getUsuarioFinal() == null || !bot.isConfigured()) return;
            vinculaciones.findByUsuarioId(pedido.getUsuarioFinal().getId())
                .filter(v -> TelegramVinculacion.ACTIVA.equals(v.getEstado()) && v.getChatId() != null)
                .ifPresent(v -> bot.enviarMensaje(v.getChatId(), texto(pedido)));
        } catch (RuntimeException e) {
            log.warn("[seguimiento] aviso Telegram no enviado para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
    }
}