package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class TelegramMessageHandler {

    private static final int MAX_TEXTO = 1_000;

    private static final String[] CAMPOS_NO_TEXTO = {
        "photo", "document", "video", "audio", "voice", "sticker", "video_note", "animation"
    };

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramRateLimitService      rateLimit;
    @Autowired private TelegramVinculacionService    vinculacion;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramMenuBuilder           menuBuilder;
    @Autowired private TelegramStockCheckService     stockCheck;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramFlujoService          telegramFlujoService;
    /** Self-proxy: @Async no aplica en llamadas internas (this.responderConIa saltearía el proxy). */
    @Autowired @Lazy private TelegramBotUpdateService self;

    public void procesarMensaje(JsonNode msg) {
        long chatId = msg.path("chat").path("id").asLong(0);
        if (chatId == 0 || !"private".equals(msg.path("chat").path("type").asText(""))) return;
        if (!rateLimit.permitidoPorRateLimit(chatId)) return;

        if (msg.has("photo") || esDocumentoImagen(msg)) {
            if (manejarFotoEntrante(chatId, msg)) return;
            bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
            return;
        }

        for (String campo : CAMPOS_NO_TEXTO) {
            if (msg.has(campo)) {
                bot.enviarMensaje(chatId, "Por seguridad solo acepto mensajes de texto y botones. No puedo procesar archivos, fotos ni audios.");
                return;
            }
        }

        String texto = msg.path("text").asText("").trim();
        if (texto.isEmpty()) return;
        if (texto.length() > MAX_TEXTO) texto = texto.substring(0, MAX_TEXTO);

        if (texto.startsWith("/start")) {
            String codigo = texto.length() > 6 ? texto.substring(6).trim() : "";
            if (!codigo.isEmpty()) {
                vinculacion.vincular(chatId, msg.path("from").path("username").asText(null), codigo);
            } else {
                Optional<TelegramVinculacion> v = vinculacion.vinculacionActiva(chatId);
                if (v.isPresent()) menuBuilder.mostrarMenu(v.get());
                else bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
            }
            return;
        }

        Optional<TelegramVinculacion> opt = vinculacion.vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();

        switch (texto) {
            case "/menu", "/ayuda", "/help" -> { menuBuilder.mostrarMenu(v); return; }
            case "/empresa"                 -> { empresaContext.mostrarSelectorEmpresa(v); return; }
            case "/cancelar"                -> {
                v.setContexto(null);
                vinculacionRepository.save(v);
                bot.enviarMensaje(chatId, "Listo, cancelado. Escribí /menu cuando me necesités.");
                return;
            }
            case "/desvincular"             -> { vinculacion.desvincular(v); return; }
            default -> { /* comando desconocido: sigue el flujo de contexto */ }
        }

        // Contexto de ajuste pendiente: se espera un número
        if (v.getContexto() != null && v.getContexto().startsWith(TelegramStockCheckService.CTX_AJUSTE)) {
            stockCheck.procesarAjusteCantidad(v, texto);
            return;
        }

        // Borrador JSON de un flujo guiado (venta rápida / alta de producto) esperando texto
        if (v.getContexto() != null && v.getContexto().startsWith("{")) {
            Long empresaIdFlujo = empresaContext.empresaValidada(v);
            if (empresaIdFlujo != null) telegramFlujoService.manejarTexto(v, empresaIdFlujo, texto);
            return;
        }

        // Texto libre → AI Copilot, en hilo aparte: la IA puede tardar hasta 25s y
        // este método corre en el hilo del webhook — si se bloquea, Telegram corta
        // por timeout y reintenta el update, congelando todo el bot ("Read timeout
        // expired"). Se responde 200 ya y la respuesta llega cuando esté.
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;
        bot.enviarAccionEscribiendo(chatId);
        String nombreUsuario = v.getUsuario() != null ? v.getUsuario().getNombre() : null;
        boolean puedeGestionar = telegramFlujoService.esPropietarioOAdmin(v.getUsuario(), empresaId);
        self.responderConIa(chatId, empresaId, texto, nombreUsuario, puedeGestionar);
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
