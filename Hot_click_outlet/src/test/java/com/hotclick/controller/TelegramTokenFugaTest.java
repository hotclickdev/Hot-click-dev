package com.hotclick.controller;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.telegram.TelegramAbusoService;
import com.hotclick.service.telegram.TelegramConfigService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;

import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Auditoría Telegram C1 (ALTO): el token nunca sale en body, logs ni alertas. C5: secret vacío → 503. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TelegramTokenFugaTest {

    static final String TOKEN = "123:FAKE";
    static final String MSG = "I/O error on POST request for \"https://api.telegram.org/bot" + TOKEN + "/setWebhook\"";

    @Mock TelegramClienteBotService bot;
    @Mock CompanyScope companyScope;
    @Mock TelegramConfigService configService;
    @InjectMocks TelegramConfigController configController;

    @Mock TelegramBotUpdateService updateService;
    @Mock TelegramAbusoService abusoMock;
    @Mock com.hotclick.security.ClientIpResolver ipResolver;

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    private ListAppender<ILoggingEvent> capturar(Class<?> c) {
        logger = (Logger) LoggerFactory.getLogger(c);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    @AfterEach void quitar() { if (logger != null) logger.detachAppender(appender); }

    private String logs() {
        return appender.list.stream().map(e -> e.getFormattedMessage()
            + (e.getThrowableProxy() != null ? e.getThrowableProxy().getMessage() : ""))
            .collect(Collectors.joining("\n"));
    }

    @Test void registrarWebhook_errorConUrl_noFiltraTokenEnBodyNiLog() {
        capturar(TelegramConfigController.class);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(bot.isConfigured()).thenReturn(true);
        when(bot.isWebhookSecretValido()).thenReturn(true);
        when(configService.registrarWebhook()).thenThrow(new ResourceAccessException(MSG));
        ResponseEntity<?> r = configController.registrarWebhook();
        assertThat(r.getStatusCode().value()).isEqualTo(502);
        assertThat(String.valueOf(r.getBody())).doesNotContain(TOKEN);
        assertThat(logs()).doesNotContain(TOKEN);
    }

    @Test void registrarWebhook_secretVacio_503SinLlamarSetWebhook() {
        when(companyScope.isAdminIT()).thenReturn(true);
        when(bot.isConfigured()).thenReturn(true);
        when(bot.isWebhookSecretValido()).thenReturn(false);
        ResponseEntity<?> r = configController.registrarWebhook();
        assertThat(r.getStatusCode().value()).isEqualTo(503);
        verify(configService, never()).registrarWebhook();
    }

    @Test void botService_secretVacioOInvalido_noEsValido() {
        TelegramClienteBotService real = new TelegramClienteBotService();
        ReflectionTestUtils.setField(real, "webhookSecret", "");
        assertThat(real.isWebhookSecretValido()).isFalse();
        ReflectionTestUtils.setField(real, "webhookSecret", "con espacio");
        assertThat(real.isWebhookSecretValido()).isFalse();
        ReflectionTestUtils.setField(real, "webhookSecret", "Abc_123-x");
        assertThat(real.isWebhookSecretValido()).isTrue();
    }

    @Test void webhook_errorProcesando_noLogueaToken() throws Exception {
        capturar(TelegramBotWebhookController.class);
        TelegramBotWebhookController c = new TelegramBotWebhookController();
        ReflectionTestUtils.setField(c, "bot", bot);
        ReflectionTestUtils.setField(c, "updateService", updateService);
        ReflectionTestUtils.setField(c, "abuso", abusoMock);
        ReflectionTestUtils.setField(c, "clientIpResolver", ipResolver);
        ReflectionTestUtils.setField(c, "objectMapper", new com.fasterxml.jackson.databind.ObjectMapper());
        when(bot.validarSecret("s")).thenReturn(true);
        doThrow(new ResourceAccessException(MSG)).when(updateService).procesarUpdate(any());
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setContent("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        c.recibirUpdate("s", req);
        assertThat(logs()).contains("ResourceAccessException").doesNotContain(TOKEN);
    }

    @Test void alertaInterna_noRecibeToken() {
        TelegramAbusoService abuso = new TelegramAbusoService();
        RateLimiter rl = mock(RateLimiter.class);
        TelegramService ts = mock(TelegramService.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        ReflectionTestUtils.setField(abuso, "rateLimiter", rl);
        ReflectionTestUtils.setField(abuso, "telegramService", ts);
        abuso.avisarErrorDeUsuario(42L, new ResourceAccessException(MSG));
        // Auditor 8 M-C: la alerta lleva solo el tipo de la excepción, nunca su mensaje
        verify(ts).enviar(argThat(s -> s.contains("ResourceAccessException") && !s.contains(TOKEN) && !s.contains("bot***")));
    }
}
