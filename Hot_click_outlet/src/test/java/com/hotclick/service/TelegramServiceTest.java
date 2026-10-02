package com.hotclick.service;

import com.hotclick.service.telegram.TelegramTexto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("TelegramService: Markdown escapado, reintento en texto plano y token fuera del log")
class TelegramServiceTest {

    private static final String TOKEN = "123456789:AAH-fake_token-for_tests";

    private RestTemplate restTemplate;
    private TelegramService service;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        service = new TelegramService(restTemplate);
        ReflectionTestUtils.setField(service, "botToken", TOKEN);
        ReflectionTestUtils.setField(service, "chatId", "-100");
    }

    private static HttpClientErrorException errorDeFormato() {
        String cuerpo = "{\"ok\":false,\"error_code\":400,\"description\":\"Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 105\"}";
        return HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", HttpHeaders.EMPTY,
            cuerpo.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("si Telegram rechaza el Markdown, reenvía el mismo texto sin parse_mode")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void reintentaSinFormato() {
        when(restTemplate.postForObject(anyString(), any(), eq(String.class)))
            .thenThrow(errorDeFormato())
            .thenReturn("{\"ok\":true}");

        service.enviar("*Alerta* WHATSAPP_PHONE_ID");

        ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(2)).postForObject(anyString(), captor.capture(), eq(String.class));
        List<HttpEntity> llamadas = captor.getAllValues();
        assertThat((Map<String, String>) llamadas.get(0).getBody()).containsEntry("parse_mode", "Markdown");
        assertThat((Map<String, String>) llamadas.get(1).getBody())
            .doesNotContainKey("parse_mode")
            .containsEntry("text", "*Alerta* WHATSAPP_PHONE_ID");
    }

    @Test
    @DisplayName("otro 400 (chat inexistente) no se reintenta")
    void otroErrorNoReintenta() {
        HttpClientErrorException chat = HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
            HttpHeaders.EMPTY, "{\"ok\":false,\"description\":\"Bad Request: chat not found\"}".getBytes(StandardCharsets.UTF_8),
            StandardCharsets.UTF_8);
        when(restTemplate.postForObject(anyString(), any(), eq(String.class))).thenThrow(chat);

        service.enviar("hola");

        verify(restTemplate, times(1)).postForObject(anyString(), any(), eq(String.class));
    }

    @Test
    @DisplayName("sinToken quita el token de la URL del bot y de la de archivos")
    void sinTokenEnmascara() {
        String mensaje = "400 Bad Request on POST request for \"https://api.telegram.org/bot" + TOKEN + "/sendMessage\"";
        assertThat(TelegramTexto.sinToken(mensaje))
            .doesNotContain(TOKEN)
            .doesNotContain("AAH-fake")
            .contains("https://api.telegram.org/bot***/sendMessage");
        assertThat(TelegramTexto.sinToken("https://api.telegram.org/file/bot" + TOKEN + "/photos/a.jpg"))
            .isEqualTo("https://api.telegram.org/file/bot***/photos/a.jpg");
        assertThat(TelegramTexto.sinToken(null)).isNull();
    }

    @Test
    @DisplayName("escaparMarkdown escapa _ * ` [ para Markdown legacy")
    void escapaMarkdown() {
        assertThat(TelegramTexto.escaparMarkdown("WHATSAPP_PHONE_ID")).isEqualTo("WHATSAPP\\_PHONE\\_ID");
        assertThat(TelegramTexto.escaparMarkdown("a*b`c[d")).isEqualTo("a\\*b\\`c\\[d");
        assertThat(TelegramTexto.escaparMarkdown(null)).isEmpty();
        assertThat(TelegramTexto.esErrorDeFormato("Bad Request: can't parse entities: x")).isTrue();
        assertThat(TelegramTexto.esErrorDeFormato("chat not found")).isFalse();
    }
}
