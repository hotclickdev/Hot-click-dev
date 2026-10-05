package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class TelegramUpdateRouter {

    @Autowired private TelegramMessageHandler  messageHandler;
    @Autowired private TelegramCallbackHandler callbackHandler;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramUpdateDedup dedup;

    private final ConcurrentHashMap<Long, Object> candados = new ConcurrentHashMap<>();

    public void procesarUpdate(JsonNode update) {
        if (update == null) return;
        if (update.hasNonNull("update_id") && !dedup.esNuevo(update.get("update_id").asLong())) return;
        Long chatId = chatDe(update);
        if (chatId == null) {
            despachar(update);
            return;
        }
        synchronized (candados.computeIfAbsent(chatId, id -> new Object())) {
            despachar(update);
        }
    }

    private void despachar(JsonNode update) {
        try {
            if (update.hasNonNull("callback_query")) {
                callbackHandler.procesarCallback(update.get("callback_query"));
            } else if (update.hasNonNull("message")) {
                messageHandler.procesarMensaje(update.get("message"));
            }
        } finally {
            TelegramVinculacion v = TelegramTurno.cerrarYTomarSiDirty();
            if (v != null && v.getId() != null) {
                vinculacionRepository.save(v);
            }
        }
    }

    private static Long chatDe(JsonNode update) {
        JsonNode msg = update.hasNonNull("callback_query")
            ? update.get("callback_query").path("message")
            : update.path("message");
        long id = msg.path("chat").path("id").asLong(0);
        return id == 0 ? null : id;
    }
}
