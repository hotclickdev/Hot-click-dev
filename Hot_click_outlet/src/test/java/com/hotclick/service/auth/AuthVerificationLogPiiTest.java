package com.hotclick.service.auth;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@DisplayName("QA4-004 | send-verification no loguea cédula, correo ni hash de contraseña")
@ExtendWith(MockitoExtension.class)
class AuthVerificationLogPiiTest {

    static final String CEDULA = "112345678";
    static final String CORREO = "pii.qa4@test.cr";
    static final String HASH = "$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123";

    @Mock org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock com.hotclick.service.EmailVerificationService emailVerificationService;
    @Mock AuthSupport authSupport;
    @Mock com.hotclick.service.TurnstileService turnstileService;
    @Mock com.hotclick.service.SecurityAuditService securityAuditService;
    @InjectMocks AuthVerificationHandler handler;

    private final Logger logger = (Logger) LoggerFactory.getLogger(AuthVerificationHandler.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach void setUp() { appender.start(); logger.addAppender(appender); }
    @AfterEach void tearDown() { logger.detachAppender(appender); }

    @Test
    void violacionDeIntegridadNoVuelcaLaFila() {
        when(turnstileService.verify(any(), any())).thenReturn(true);
        String detalle = "ERROR: null value in column \"telefono\" violates not-null constraint\n  Detail: Failing row contains (7, "
            + CEDULA + ", " + CORREO + ", " + HASH + ", null)";
        doThrow(new DataIntegrityViolationException("could not execute statement",
                new RuntimeException(detalle))).when(emailVerificationService).iniciarRegistro(any());

        var res = handler.sendVerification(new Usuario(), null, new MockHttpServletRequest());

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(appender.list).isNotEmpty();
        for (ILoggingEvent ev : appender.list) {
            StringBuilder todo = new StringBuilder(ev.getFormattedMessage());
            for (var t = ev.getThrowableProxy(); t != null; t = t.getCause()) todo.append(' ').append(t.getMessage());
            assertThat(todo.toString()).doesNotContain(CEDULA).doesNotContain(CORREO).doesNotContain(HASH)
                .doesNotContain("Failing row");
        }
    }

    @Test
    void hibernateSqlExceptionHelperApagadoEnLogback() throws Exception {
        try (var in = getClass().getResourceAsStream("/logback-spring.xml")) {
            String xml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(xml).containsPattern(
                "<logger\\s+name=\"org\\.hibernate\\.engine\\.jdbc\\.spi\\.SqlExceptionHelper\"\\s+level=\"OFF\"");
        }
    }
}
