package com.hotclick.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Webhook entrante del bot de Telegram para clientes.
 *
 * La ruta /api/webhooks/** es pública en SecurityConfig, así que la autenticación
 * real es el header X-Telegram-Bot-Api-Secret-Token: Telegram lo manda en cada
 * update con el valor registrado via setWebhook. Sin match exacto → 403 y el
 * update ni se parsea.
 *
 * Siempre responde 200 a updates válidos aunque el procesamiento falle —
 * si Telegram recibe un 5xx reintenta el mismo update en loop.
 */
@RestController
@RequestMapping("/api/webhooks")
public class TelegramBotWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotWebhookController.class);

    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramBotUpdateService updateService;

    @PostMapping("/telegram")
    public ResponseEntity<Void> recibirUpdate(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            @RequestBody JsonNode update) {

        if (!bot.validarSecret(secret)) {
            log.warn("[telegram-webhook] update rechazado — secret token inválido o ausente");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            updateService.procesarUpdate(update);
        } catch (Exception e) {
            log.error("[telegram-webhook] error procesando update — {}", e.getMessage(), e);
        }
        return ResponseEntity.ok().build();
    }
}
