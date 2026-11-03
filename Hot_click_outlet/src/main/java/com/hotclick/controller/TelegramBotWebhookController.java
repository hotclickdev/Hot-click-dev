package com.hotclick.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.telegram.TelegramAbusoService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;

/**
 * Webhook entrante del bot de Telegram para clientes.
 *
 * La ruta /api/webhooks/** es pública en SecurityConfig, así que la autenticación
 * real es el header X-Telegram-Bot-Api-Secret-Token: Telegram lo manda en cada
 * update con el valor registrado via setWebhook. Sin match exacto → 403 y el
 * update ni se lee ni se parsea (Auditor 8 M-B): el body se lee a mano, DESPUÉS de validar el
 * secret, con un tope real de {@value #MAX_BODY_BYTES} bytes que aplica también a bodies
 * chunked (no se confía en Content-Length).
 *
 * Siempre responde 200 a updates válidos aunque el procesamiento falle —
 * si Telegram recibe un 5xx reintenta el mismo update en loop.
 */
@RestController
@RequestMapping("/api/webhooks")
public class TelegramBotWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotWebhookController.class);

    /** Un update de Telegram pesa pocos KB; mismo tope que el webhook de ONVO. */
    static final int MAX_BODY_BYTES = 64 * 1024;

    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramBotUpdateService updateService;
    @Autowired private TelegramAbusoService abuso;
    @Autowired private ClientIpResolver clientIpResolver;
    @Autowired private ObjectMapper objectMapper;

    @PostMapping("/telegram")
    public ResponseEntity<Void> recibirUpdate(
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
            HttpServletRequest request) {

        if (!bot.validarSecret(secret)) {
            log.warn("[telegram-webhook] update rechazado — secret token inválido o ausente");
            abuso.secretoInvalido(clientIpResolver.resolve(request));
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }
        byte[] cuerpo;
        try (InputStream in = request.getInputStream()) {
            cuerpo = in.readNBytes(MAX_BODY_BYTES + 1); // tope real: también con Transfer-Encoding: chunked
        } catch (IOException e) {
            log.warn("[telegram-webhook] no se pudo leer el body — {}", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().build();
        }
        if (cuerpo.length > MAX_BODY_BYTES) {
            log.warn("[telegram-webhook] body mayor a {} bytes rechazado", MAX_BODY_BYTES);
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }
        JsonNode update;
        try {
            update = objectMapper.readTree(cuerpo);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
        if (update == null || !update.isObject()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            updateService.procesarUpdate(update);
        } catch (Exception e) {
            log.error("[telegram-webhook] error procesando update — {}", e.getClass().getSimpleName());
        }
        return ResponseEntity.ok().build();
    }
}
