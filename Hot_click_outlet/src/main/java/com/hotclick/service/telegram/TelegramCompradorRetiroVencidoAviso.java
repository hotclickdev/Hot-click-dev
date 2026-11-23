package com.hotclick.service.telegram;

import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.retiro.PedidoRetiroTokenService;
import com.hotclick.service.retiro.RetiroVencidoEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * Avisa por Telegram al comprador cuyo QR de retiro venció. Corre tras el commit del VENCIDO (o de inmediato si no
 * había transacción) y nunca lanza: el pedido sigue pagado, sin reembolso ni cambio de estado ni de stock.
 */
@Component
public class TelegramCompradorRetiroVencidoAviso {

    private static final Logger log = LoggerFactory.getLogger(TelegramCompradorRetiroVencidoAviso.class);

    static final String MENSAJE = "⌛ El código QR de retiro de tu pedido venció (valía "
        + PedidoRetiroTokenService.HORAS_VIGENCIA_POR_DEFECTO + " horas). "
        + "Tu pedido sigue pagado: en la tienda te lo entregan igual. Solo avisales que pagaste por Telegram.";

    @Autowired private TelegramCompradorSesionRepository sesionRepository;
    @Autowired private TelegramClienteBotService bot;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alVencerRetiro(RetiroVencidoEvent evento) {
        try {
            List<TelegramCompradorSesion> sesiones = sesionRepository.findByPedidoIdIn(evento.pedidoIds());
            int avisados = TelegramCompradorAvisoMapeos.paraCadaChat(sesiones, this::avisar);
            log.info("[retiro-qr] aviso de QR vencido a {} chat(s)", avisados);
        } catch (RuntimeException e) {
            log.warn("[retiro-qr] aviso de QR vencido falló ({})", e.getClass().getSimpleName());
        }
    }

    private boolean avisar(Long chatId) {
        try {
            bot.enviarMensaje(chatId, MENSAJE);
            return true;
        } catch (RuntimeException e) {
            log.warn("[retiro-qr] no se pudo avisar un chat ({})", e.getClass().getSimpleName());
            return false;
        }
    }
}
