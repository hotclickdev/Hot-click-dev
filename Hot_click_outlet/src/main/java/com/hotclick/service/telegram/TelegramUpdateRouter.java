package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TelegramUpdateRouter {

    @Autowired private TelegramMessageHandler  messageHandler;
    @Autowired private TelegramCallbackHandler callbackHandler;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;

    public void procesarUpdate(JsonNode update) {
        if (update == null) return;
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
}
