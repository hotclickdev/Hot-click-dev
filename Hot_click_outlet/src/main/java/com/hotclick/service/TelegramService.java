package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);
    private static final String API_URL = "https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=Markdown";

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
            String encoded = URLEncoder.encode(mensaje, StandardCharsets.UTF_8);
            String url = String.format(API_URL, botToken, chatId, encoded);
            restTemplate.getForObject(url, String.class);
            log.info("[telegram] mensaje enviado");
        } catch (Exception e) {
            log.error("[telegram] error al enviar — {}", e.getMessage());
        }
    }
}
