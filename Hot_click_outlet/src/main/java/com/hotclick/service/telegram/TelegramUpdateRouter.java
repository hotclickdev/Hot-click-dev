package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TelegramUpdateRouter {

    @Autowired private TelegramMessageHandler  messageHandler;
    @Autowired private TelegramCallbackHandler callbackHandler;

    public void procesarUpdate(JsonNode update) {
        if (update == null) return;
        if (update.hasNonNull("callback_query")) {
            callbackHandler.procesarCallback(update.get("callback_query"));
        } else if (update.hasNonNull("message")) {
            messageHandler.procesarMensaje(update.get("message"));
        }
        // Cualquier otro tipo de update se ignora (allowed_updates ya lo restringe)
    }
}
