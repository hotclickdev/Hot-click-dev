package com.hotclick.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.repository.SecurityAuditLogRepository;
import com.hotclick.security.CorreoLogSeguro;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class SecurityAuditServiceLogMascaraTest {

    @Test
    void logSecEnmascaraCorreo() {
        Logger logger = (Logger) LoggerFactory.getLogger(SecurityAuditService.class);
        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        logger.addAppender(app);
        try {
            new SecurityAuditService(mock(SecurityAuditLogRepository.class), new ObjectMapper())
                .log(SecurityEventType.LOGIN_FAILED, SecurityEventSeverity.MEDIUM, null,
                    "testuser@hotclick.cr", "127.0.0.1", "ua", "/api/auth/login", Map.of());
        } finally {
            logger.detachAppender(app);
        }
        String linea = app.list.stream().map(ILoggingEvent::getFormattedMessage)
            .filter(m -> m.startsWith("[SEC] type=")).findFirst().orElseThrow();
        assertThat(linea).contains("email=t***@hotclick.cr").doesNotContain("testuser@");
    }

    @Test
    void helperFormato() {
        assertThat(CorreoLogSeguro.enmascarar("ana@example.com")).isEqualTo("a***@example.com");
        assertThat(CorreoLogSeguro.enmascarar(" ana@example.com ")).isEqualTo("a***@example.com");
        assertThat(CorreoLogSeguro.enmascarar("sin-arroba")).isEqualTo("***");
        assertThat(CorreoLogSeguro.enmascarar("@x.com")).isEqualTo("***");
        assertThat(CorreoLogSeguro.enmascarar(null)).isEqualTo("***");
    }
}
