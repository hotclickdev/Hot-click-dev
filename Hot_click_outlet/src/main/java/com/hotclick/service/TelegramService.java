package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.hotclick.service.telegram.TelegramTexto;

import java.util.HashMap;
import java.util.Map;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    @Value("${telegram.bot-token:}")
    private String botToken;

    @Value("${telegram.chat-id:}")
    private String chatId;

    private final RestTemplate restTemplate;

    public TelegramService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Envía una alerta al canal interno. El texto usa Markdown legacy ({@code *negrita*}); los valores
     * dinámicos deben pasar por {@link TelegramTexto#escaparMarkdown(String)}. Si Telegram igual rechaza
     * el formato (400 «can't parse entities»), se reenvía una vez como texto plano para que la alerta llegue.
     * El log nunca incluye la URL con el token del bot.
     */
    @Async
    public void enviar(String mensaje) {
        if (botToken.isBlank() || chatId.isBlank()) {
            log.warn("[telegram] no configurado — TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID vacios");
            return;
        }
        try {
            publicar(mensaje, true);
            log.info("[telegram] mensaje enviado");
        } catch (HttpClientErrorException e) {
            String respuesta = e.getResponseBodyAsString();
            if (TelegramTexto.esErrorDeFormato(respuesta)) {
                reenviarSinFormato(mensaje);
                return;
            }
            log.error("[telegram] error al enviar — HTTP {} {}", e.getStatusCode().value(), e.getClass().getSimpleName());
        } catch (Exception e) {
            log.error("[telegram] error al enviar — {}", e.getClass().getSimpleName());
        }
    }

    private void reenviarSinFormato(String mensaje) {
        log.warn("[telegram] Markdown rechazado, se reenvía como texto plano");
        try {
            publicar(mensaje, false);
            log.info("[telegram] mensaje enviado (texto plano)");
        } catch (HttpClientErrorException e) {
            log.error("[telegram] error al enviar — HTTP {} {}", e.getStatusCode().value(), e.getClass().getSimpleName());
        } catch (Exception e) {
            log.error("[telegram] error al enviar — {}", e.getClass().getSimpleName());
        }
    }

    private void publicar(String mensaje, boolean markdown) {
        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", mensaje);
        if (markdown) body.put("parse_mode", "Markdown");

        restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
    }
}
