package com.hotclick.service.telegram;

import com.hotclick.security.RateLimiter;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TelegramRateLimitService {

    private static final int RATE_POR_MINUTO = 20;
    private static final int RATE_POR_DIA    = 300;

    @Autowired private RateLimiter               rateLimiter;
    @Autowired private TelegramClienteBotService bot;

    public boolean permitidoPorRateLimit(long chatId) {
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":dia", RATE_POR_DIA, 86_400)) {
            if (rateLimiter.tryAcquire("tg:" + chatId + ":aviso", 1, 3_600)) {
                bot.enviarMensaje(chatId, "Alcanzaste el límite diario de consultas por Telegram. Volvé a intentarlo mañana o usá el panel web.");
            }
            return false;
        }
        if (!rateLimiter.tryAcquire("tg:" + chatId + ":min", RATE_POR_MINUTO, 60)) {
            if (rateLimiter.tryAcquire("tg:" + chatId + ":aviso", 1, 3_600)) {
                bot.enviarMensaje(chatId, "Demasiados mensajes seguidos. Esperá un minuto e intentá de nuevo.");
            }
            return false;
        }
        return true;
    }
}
