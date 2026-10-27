package com.hotclick.service.whatsapp;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.repository.WaMensajeLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Seguridad: los logs de WhatsAppMessageSender no llevan teléfono ni el texto enviado (puede traer nombres). */
@DisplayName("Logs WhatsApp sin PII")
class LogPiiWhatsAppTest {

    private static final String TELEFONO = "88881234";
    private static final String TEXTO = "Hola Ana Mora, tu pedido va en camino";

    private final WhatsAppMetaApiClient meta = mock(WhatsAppMetaApiClient.class);
    private final WhatsAppMessageSender sender = new WhatsAppMessageSender();
    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void armar() {
        ReflectionTestUtils.setField(sender, "metaApiClient", meta);
        ReflectionTestUtils.setField(sender, "geminiTextClient", mock(WhatsAppGeminiTextClient.class));
        ReflectionTestUtils.setField(sender, "logRepo", mock(WaMensajeLogRepository.class));
        logger = (Logger) LoggerFactory.getLogger(WhatsAppMessageSender.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void soltar() { logger.detachAppender(appender); }

    private void sinPii() {
        assertThat(appender.list).isNotEmpty();
        for (ILoggingEvent ev : appender.list) {
            assertThat(ev.getFormattedMessage()).doesNotContain(TELEFONO).doesNotContain(TEXTO).doesNotContain("Ana Mora");
        }
    }

    @Test
    void simulado_sinTelefonoNiTexto() {
        when(meta.credencialesConfiguradas()).thenReturn(false);
        sender.enviarTextoFijo(TELEFONO, 7L, 3L, TEXTO);
        sinPii();
    }

    @Test
    void enviado_sinTelefonoNiTexto() {
        when(meta.credencialesConfiguradas()).thenReturn(true);
        when(meta.llamarMetaApi(anyString(), anyString())).thenReturn("wamid.1");
        sender.enviarTextoFijo(TELEFONO, 7L, 3L, TEXTO);
        sinPii();
        assertThat(appender.list.get(0).getFormattedMessage()).contains("usuarioId=3").contains("empresaId=7");
    }

    @Test
    void error_sinTelefonoNiMensajeDeMeta() {
        when(meta.credencialesConfiguradas()).thenReturn(true);
        when(meta.llamarMetaApi(anyString(), anyString()))
            .thenThrow(new IllegalStateException("Meta rechazó 506" + TELEFONO));
        sender.enviarTextoFijo(TELEFONO, 7L, 3L, TEXTO);
        sinPii();
    }
}
