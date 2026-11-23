package com.hotclick.service.security;

import com.hotclick.model.SecurityAlert;
import com.hotclick.repository.SecurityAlertRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.TelegramService;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("SecurityAlertNotifier: la IP completa no aparece en log, correo ni Telegram")
class SecurityAlertNotifierIpTest {

    private static final String IP = "190.10.20.30";

    @Test
    void ipEnmascaradaEnLogCorreoYTelegram() {
        var repo = mock(SecurityAlertRepository.class);
        var email = mock(ResendEmailService.class);
        var telegram = mock(TelegramService.class);
        var notifier = new SecurityAlertNotifier(repo, email, new SecurityRateWindowTracker(), telegram);
        ReflectionTestUtils.setField(notifier, "securityAlertEmail", "ops@example.test");

        Logger logger = (Logger) LoggerFactory.getLogger(SecurityAlertNotifier.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            notifier.generateAlert("BRUTE_FORCE", SecurityEventSeverity.CRITICAL, IP, 7L,
                "5 intentos desde " + IP, "detalle " + IP);
            verify(email, timeout(3000)).send(eq("ops@example.test"), anyString(), anyString());
        } finally {
            logger.detachAppender(appender);
        }

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(email).send(anyString(), anyString(), html.capture());
        assertThat(html.getValue()).doesNotContain(IP).contains("190.10.20.xxx");

        ArgumentCaptor<String> tg = ArgumentCaptor.forClass(String.class);
        verify(telegram).enviar(tg.capture());
        assertThat(tg.getValue()).doesNotContain(IP).contains("190.10.20.xxx");

        assertThat(appender.list).isNotEmpty()
            .allSatisfy(e -> assertThat(e.getFormattedMessage()).doesNotContain(IP));
        assertThat(appender.list.stream().map(ILoggingEvent::getFormattedMessage).anyMatch(m -> m.contains("190.10.20.xxx"))).isTrue();

        // La tabla de alertas (panel admin) conserva la IP completa.
        ArgumentCaptor<SecurityAlert> alerta = ArgumentCaptor.forClass(SecurityAlert.class);
        verify(repo).save(alerta.capture());
        assertThat(alerta.getValue().getIpAddress()).isEqualTo(IP);
    }
}
