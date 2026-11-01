package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** INF-03: el canal de alertas por Telegram queda apagado sin TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID y falla en silencio. */
@DisplayName("TelegramService (INF-03): apagado por defecto, falla en silencio y log sin PII")
class TelegramAlertasApagadasTest {

    private static final String TOKEN_FALSO = "123456789:AAH-fake_token-for_tests";
    private static final String MENSAJE = "Pedido de cliente@correo.test +50688887777";

    private RestTemplate restTemplate;
    private TelegramService service;
    private ListAppender<ILoggingEvent> logs;
    private Logger logger;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        service = new TelegramService(restTemplate);
        logger = (Logger) LoggerFactory.getLogger(TelegramService.class);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void tearDown() { logger.detachAppender(logs); }

    private void config(String token, String chat) {
        ReflectionTestUtils.setField(service, "botToken", token);
        ReflectionTestUtils.setField(service, "chatId", chat);
    }

    private void assertLogsSinDatos() {
        assertThat(logs.list).isNotEmpty();
        for (ILoggingEvent e : logs.list) {
            assertThat(e.getFormattedMessage())
                .doesNotContain(TOKEN_FALSO).doesNotContain("cliente@correo.test")
                .doesNotContain("50688887777").doesNotContain("-100777");
        }
    }

    @Test
    @DisplayName("sin token ni chat (default) no llama a Telegram y deja un warn sin datos")
    void sinConfiguracion() {
        config("", "");
        assertThatCode(() -> service.enviar(MENSAJE)).doesNotThrowAnyException();
        verifyNoInteractions(restTemplate);
        assertLogsSinDatos();
    }

    @Test
    @DisplayName("token sin chat id tampoco envía")
    void tokenSinChat() {
        config(TOKEN_FALSO, "");
        service.enviar(MENSAJE);
        verifyNoInteractions(restTemplate);
        assertLogsSinDatos();
    }

    @Test
    @DisplayName("chat id sin token tampoco envía")
    void chatSinToken() {
        config("", "-100777");
        service.enviar(MENSAJE);
        verifyNoInteractions(restTemplate);
        assertLogsSinDatos();
    }

    @Test
    @DisplayName("Telegram caído: no propaga la excepción y el log no lleva token, chat ni mensaje")
    void redCaida() {
        config(TOKEN_FALSO, "-100777");
        when(restTemplate.postForObject(anyString(), any(), eq(String.class)))
            .thenThrow(new ResourceAccessException("I/O error on POST https://api.telegram.org/bot" + TOKEN_FALSO));
        assertThatCode(() -> service.enviar(MENSAJE)).doesNotThrowAnyException();
        assertLogsSinDatos();
    }
}
