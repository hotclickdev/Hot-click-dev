package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Enrutamiento de mensajes de texto del bot — extraído bit-idéntico de {@link TelegramMessageHandler}.
 */
@Component
class TelegramMessageRoutingHelper {

    private static final String[] CAMPOS_NO_TEXTO = {
        "photo", "document", "video", "audio", "voice", "sticker", "video_note", "animation"
    };

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionService    vinculacion;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramMenuBuilder           menuBuilder;
    @Autowired private TelegramStockCheckService     stockCheck;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramFlujoService          telegramFlujoService;
    @Autowired @Lazy private TelegramBotUpdateService self;

    boolean rechazarMediaNoTexto(long chatId, JsonNode msg) {
        for (String campo : CAMPOS_NO_TEXTO) {
            if (msg.has(campo)) {
                bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
                return true;
            }
        }
        return false;
    }

    /** @return true si el mensaje fue consumido. */
    boolean manejarStart(long chatId, JsonNode msg, String texto) {
        if (!texto.startsWith("/start")) return false;
        String codigo = texto.length() > 6 ? texto.substring(6).trim() : "";
        if (!codigo.isEmpty()) {
            vinculacion.vincular(chatId, msg.path("from").path("username").asText(null), codigo);
        } else {
            Optional<TelegramVinculacion> v = vinculacion.vinculacionActiva(chatId);
            if (v.isPresent()) menuBuilder.mostrarMenu(v.get());
            else bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
        }
        return true;
    }

    /** @return true si el mensaje fue consumido. */
    boolean manejarComandoSlash(TelegramVinculacion v, long chatId, String texto) {
        switch (texto) {
            case "/menu", "/ayuda", "/help" -> { menuBuilder.mostrarMenu(v); return true; }
            case "/empresa"                 -> { empresaContext.mostrarSelectorEmpresa(v); return true; }
            case "/cancelar"                -> {
                v.setContexto(null);
                vinculacionRepository.save(v);
                bot.enviarMensaje(chatId, "Listo, cancelado. Escribí /menu cuando me necesités.");
                return true;
            }
            case "/desvincular"             -> { vinculacion.desvincular(v); return true; }
            default -> { return false; }
        }
    }

    /** @return true si el mensaje fue consumido. */
    boolean manejarContexto(TelegramVinculacion v, String texto) {
        if (v.getContexto() != null && v.getContexto().startsWith(TelegramStockCheckService.CTX_AJUSTE)) {
            stockCheck.procesarAjusteCantidad(v, texto);
            return true;
        }
        if (v.getContexto() != null && v.getContexto().startsWith("{")) {
            Long empresaIdFlujo = empresaContext.empresaValidada(v);
            if (empresaIdFlujo != null) telegramFlujoService.manejarTexto(v, empresaIdFlujo, texto);
            return true;
        }
        return false;
    }

    void despacharIa(TelegramVinculacion v, long chatId, String texto) {
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;
        bot.enviarAccionEscribiendo(chatId);
        String nombreUsuario = v.getUsuario() != null ? v.getUsuario().getNombre() : null;
        boolean puedeGestionar = telegramFlujoService.esPropietarioOAdmin(v.getUsuario(), empresaId);
        self.responderConIa(chatId, empresaId, texto, nombreUsuario, puedeGestionar);
    }
}
