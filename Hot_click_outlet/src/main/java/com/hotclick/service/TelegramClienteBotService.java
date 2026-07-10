package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP del bot de Telegram PARA CLIENTES (emprendedores/pymes).
 *
 * Es un bot distinto al de TelegramService (alertas internas de HotClick):
 * este habla con los dueños de negocio vinculados via hot_click_telegram_vinculacion_tb.
 *
 * Seguridad:
 *  - El webhook entrante se valida contra webhook-secret (header
 *    X-Telegram-Bot-Api-Secret-Token que Telegram reenvía en cada update).
 *  - Los envíos fallan en silencio (log) — nunca rompen la operación que los originó.
 */
@Service
public class TelegramClienteBotService {

    private static final Logger log = LoggerFactory.getLogger(TelegramClienteBotService.class);
    private static final String API_BASE = "https://api.telegram.org/bot";

    @Value("${telegram.client.bot-token:}")
    private String botToken;

    @Value("${telegram.client.bot-username:}")
    private String botUsername;

    @Value("${telegram.client.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.url:http://localhost:8080}")
    private String appUrl;

    private final RestTemplate restTemplate;

    /** Cliente aparte para bajar archivos: una foto puede tardar más que los 10s del compartido. */
    private final RestTemplate descargaTemplate;

    public TelegramClienteBotService(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(10))
                .build();
        this.descargaTemplate = builder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(20))
                .build();
    }

    public boolean isConfigured() {
        return botToken != null && !botToken.isBlank();
    }

    public String getBotUsername() {
        return botUsername;
    }

    /** Compara en tiempo constante el secret que Telegram manda en cada update. */
    public boolean validarSecret(String headerValue) {
        if (webhookSecret == null || webhookSecret.isBlank() || headerValue == null) return false;
        return java.security.MessageDigest.isEqual(
                webhookSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                headerValue.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    public void enviarMensaje(Long chatId, String texto) {
        enviarMensaje(chatId, texto, null, true);
    }

    public void enviarMensaje(Long chatId, String texto, List<List<Map<String, Object>>> inlineKeyboard) {
        enviarMensaje(chatId, texto, inlineKeyboard, true);
    }

    /**
     * @param markdown false para texto libre de la IA — evita que un carácter especial
     *                 rompa el parseo de entities de Telegram y el mensaje no llegue.
     */
    public void enviarMensaje(Long chatId, String texto, List<List<Map<String, Object>>> inlineKeyboard, boolean markdown) {
        if (!isConfigured() || chatId == null) return;
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", texto);
            if (markdown) body.put("parse_mode", "Markdown");
            if (inlineKeyboard != null && !inlineKeyboard.isEmpty()) {
                body.put("reply_markup", Map.of("inline_keyboard", inlineKeyboard));
            }
            post("sendMessage", body);
        } catch (Exception e) {
            log.error("[telegram-cliente] error enviando a chat {} — {}", chatId, e.getMessage());
        }
    }

    /** Muestra "escribiendo…" en el chat mientras un proceso lento (la IA) trabaja. */
    public void enviarAccionEscribiendo(Long chatId) {
        if (!isConfigured() || chatId == null) return;
        try {
            post("sendChatAction", Map.of("chat_id", chatId, "action", "typing"));
        } catch (Exception e) {
            log.debug("[telegram-cliente] sendChatAction falló — {}", e.getMessage());
        }
    }

    /** Ack del botón presionado — quita el reloj de espera en el cliente de Telegram. */
    public void responderCallback(String callbackQueryId) {
        if (!isConfigured() || callbackQueryId == null) return;
        try {
            post("answerCallbackQuery", Map.of("callback_query_id", callbackQueryId));
        } catch (Exception e) {
            log.warn("[telegram-cliente] answerCallbackQuery falló — {}", e.getMessage());
        }
    }

    /**
     * Registra el webhook en Telegram apuntando a este backend, con el secret configurado.
     * Se invoca una sola vez desde el panel ADMIN (POST /api/telegram/admin/webhook).
     */
    public String configurarWebhook() {
        Map<String, Object> body = Map.of(
                "url", appUrl + "/api/webhooks/telegram",
                "secret_token", webhookSecret,
                "allowed_updates", List.of("message", "callback_query"),
                "drop_pending_updates", true
        );
        return post("setWebhook", body);
    }

    /**
     * Descarga un archivo enviado al bot (getFile → file_path → GET del binario).
     *
     * Seguridad:
     *  - Se valida file_size ANTES de descargar; si excede maxBytes se aborta.
     *  - file_path se rechaza si intenta escapar de la ruta del bot ("..", ruta absoluta).
     *  - Nunca lanza: devuelve null si algo falla y el caller decide el mensaje al usuario.
     */
    public byte[] descargarArchivo(String fileId, long maxBytes) {
        if (!isConfigured() || fileId == null || fileId.isBlank()) return null;
        try {
            String respuesta = post("getFile", Map.of("file_id", fileId));
            com.fasterxml.jackson.databind.JsonNode nodo =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(respuesta);
            if (!nodo.path("ok").asBoolean(false)) return null;

            long fileSize   = nodo.path("result").path("file_size").asLong(Long.MAX_VALUE);
            String filePath = nodo.path("result").path("file_path").asText("");
            if (fileSize > maxBytes) {
                log.warn("[telegram-cliente] archivo {} excede el límite ({} > {} bytes)", fileId, fileSize, maxBytes);
                return null;
            }
            if (filePath.isBlank() || filePath.contains("..") || filePath.startsWith("/")) {
                log.warn("[telegram-cliente] file_path sospechoso para {}: '{}'", fileId, filePath);
                return null;
            }

            byte[] bytes = descargaTemplate.getForObject(
                    "https://api.telegram.org/file/bot" + botToken + "/" + filePath, byte[].class);
            if (bytes != null && bytes.length > maxBytes) return null;
            return bytes;
        } catch (Exception e) {
            log.error("[telegram-cliente] error descargando archivo {} — {}", fileId, e.getMessage());
            return null;
        }
    }

    private String post(String metodo, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.postForObject(
                API_BASE + botToken + "/" + metodo,
                new HttpEntity<>(body, headers),
                String.class);
    }

    /** Fila de un teclado inline: cada botón es {text, callback_data}. */
    public static Map<String, Object> boton(String texto, String callbackData) {
        return Map.of("text", texto, "callback_data", callbackData);
    }
}
