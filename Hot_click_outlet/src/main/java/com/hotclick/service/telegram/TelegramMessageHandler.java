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
    @Autowired private TelegramAbusoService         abuso;

    public void procesarMensaje(JsonNode msg) {
        long chatId = msg.path("chat").path("id").asLong(0);
        if (chatId == 0 || !"private".equals(msg.path("chat").path("type").asText(""))) return;
        if (!rateLimit.permitidoPorRateLimit(chatId)) return;

        Optional<TelegramVinculacion> previa = vinculacion.vinculacionActiva(chatId);
        if (previa.isPresent() && abuso.rechazarSiPausadoOBloqueado(previa.get())) return;

        if (msg.has("photo") || esDocumentoImagen(msg)) {
            abrirTurno(previa.orElse(null), idMensaje(msg), true);
            if (manejarFotoEntrante(chatId, msg)) return;
            bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
            return;
        }

        if (routing.rechazarMediaNoTexto(chatId, msg)) return;

        String texto = msg.path("text").asText("").trim();
        if (texto.isEmpty()) return;
        if (texto.length() > MAX_TEXTO) texto = texto.substring(0, MAX_TEXTO);
        if (abuso.rechazarSiInyeccion(chatId, texto)) return;

        if (routing.manejarStart(chatId, msg, texto)) return;

        Optional<TelegramVinculacion> opt = vinculacion.vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();
        boolean enPaso = v.getContexto() != null
            && (v.getContexto().startsWith("{") || v.getContexto().startsWith("AJUSTE"));
        abrirTurno(v, idMensaje(msg), enPaso);

        if (routing.manejarComandoSlash(v, chatId, texto)) return;

        if (routing.manejarContexto(v, texto)) return;

        routing.despacharIa(v, chatId, texto);
    }

    /** true si el mensaje es un documento cuyo mime_type es una imagen (envío sin comprimir desde Telegram Desktop). */
    private boolean esDocumentoImagen(JsonNode msg) {
        if (!msg.has("document")) return false;
        return msg.path("document").path("mime_type").asText("").startsWith("image/");
    }

    private void abrirTurno(TelegramVinculacion v, long messageId, boolean borrarEntrada) {
        if (v == null) return;
        Long panel = v.getPanelMessageId();
        Long borrar = borrarEntrada && messageId > 0 ? messageId : null;
        TelegramTurno.abrir(v, panel, borrar);
        bot.enviarAccionEscribiendo(v.getChatId());
    }

    private long idMensaje(JsonNode msg) {
        return msg.path("message_id").asLong(0);
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

