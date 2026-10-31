package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

/** Regresión: las líneas [SEC] no deben escribir el correo completo en el log. */
class SecurityAuditServiceCorreoLogTest {

    private final Logger logger = (Logger) LoggerFactory.getLogger(SecurityAuditService.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach void setUp() { appender.start(); logger.addAppender(appender); }
    @AfterEach void tearDown() { logger.detachAppender(appender); }

    @Test
    void lineaSecEnmascaraCorreo() {
        SecurityAuditService svc = new SecurityAuditService(
                Mockito.mock(SecurityAuditLogRepository.class), new ObjectMapper());

        svc.log(SecurityEventType.values()[0], SecurityEventSeverity.values()[0],
                null, "persona.secreta@example.com", "127.0.0.1", "ua", "/api/auth/login", null);

        String sec = appender.list.stream().map(ILoggingEvent::getFormattedMessage)
                .filter(m -> m.startsWith("[SEC] type=")).findFirst().orElseThrow();
        assertThat(sec).doesNotContain("persona.secreta@example.com").doesNotContain("persona.secreta");
        assertThat(sec).contains("@example.com");
    }
}
