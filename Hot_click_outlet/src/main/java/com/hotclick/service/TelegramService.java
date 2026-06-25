package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);

    @Value("${telegram.bot-token:}")
    private String botToken;

    @Value("${telegram.chat-id:}")
    private String chatId;

    private final RestTemplate restTemplate;

    public TelegramService(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Async
    public void enviar(String mensaje) {
        if (botToken.isBlank() || chatId.isBlank()) {
            log.warn("[telegram] no configurado — TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID vacios");
            return;
        }
        try {
            String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of(
                    "chat_id", chatId,
                    "text", mensaje,
                    "parse_mode", "Markdown"
            );

            restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
            log.info("[telegram] mensaje enviado");
        } catch (Exception e) {
            log.error("[telegram] error al enviar — {}", e.getMessage());
        }
    }
}
