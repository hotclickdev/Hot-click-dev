package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class TelegramMessageHandler {

    private static final int MAX_TEXTO = 1_000;

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramRateLimitService      rateLimit;
    @Autowired private TelegramVinculacionService    vinculacion;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramFlujoService          telegramFlujoService;
    @Autowired private TelegramMessageRoutingHelper  routing;

    public void procesarMensaje(JsonNode msg) {
        long chatId = msg.path("chat").path("id").asLong(0);
        if (chatId == 0 || !"private".equals(msg.path("chat").path("type").asText(""))) return;
        if (!rateLimit.permitidoPorRateLimit(chatId)) return;

        if (msg.has("photo") || esDocumentoImagen(msg)) {
            if (manejarFotoEntrante(chatId, msg)) return;
            bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
            return;
        }

        if (routing.rechazarMediaNoTexto(chatId, msg)) return;

        String texto = msg.path("text").asText("").trim();
        if (texto.isEmpty()) return;
        if (texto.length() > MAX_TEXTO) texto = texto.substring(0, MAX_TEXTO);

        if (routing.manejarStart(chatId, msg, texto)) return;

        Optional<TelegramVinculacion> opt = vinculacion.vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();

        if (routing.manejarComandoSlash(v, chatId, texto)) return;

        if (routing.manejarContexto(v, texto)) return;

        routing.despacharIa(v, chatId, texto);
    }

    /** true si el mensaje es un documento cuyo mime_type es una imagen (envío sin comprimir desde Telegram Desktop). */
    private boolean esDocumentoImagen(JsonNode msg) {
        if (!msg.has("document")) return false;
        return msg.path("document").path("mime_type").asText("").startsWith("image/");
    }

    /** true si la foto se consumió como paso del alta de producto (TelegramFlujoService); false si no aplica. */
    private boolean manejarFotoEntrante(long chatId, JsonNode msg) {
        Optional<TelegramVinculacion> opt = vinculacion.vinculacionActiva(chatId);
        if (opt.isEmpty()) return false;
        TelegramVinculacion v = opt.get();
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return false;
        return telegramFlujoService.manejarFoto(v, empresaId, msg);
    }
}
