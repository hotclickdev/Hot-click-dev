package com.hotclick.service.email;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.service.ResendEmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** Seguridad: los logs de NotificacionNegocioEmailSender no llevan el correo del destinatario. */
@DisplayName("Logs email de negocio sin PII")
class LogPiiNegocioEmailTest {

    private static final String CORREO = "ana.mora@test.cr";
    private static final String ADMIN = "admin.ops@test.cr";

    private final ResendEmailService resend = mock(ResendEmailService.class);
    private final NotificacionNegocioEmailSender sender = new NotificacionNegocioEmailSender();
    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void armar() {
        ReflectionTestUtils.setField(sender, "resendEmailService", resend);
        ReflectionTestUtils.setField(sender, "negocioEmailBuilder", mock(NegocioEmailBuilder.class));
        ReflectionTestUtils.setField(sender, "emailLayoutHelper", mock(EmailLayoutHelper.class));
        logger = (Logger) LoggerFactory.getLogger(NotificacionNegocioEmailSender.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void soltar() { logger.detachAppender(appender); }

    private void todos() {
        sender.enviarCuponBienvenida(CORREO, "C1");
        sender.enviarBienvenidaEmprendedor(CORREO, "Ana", "Tienda");
        sender.enviarAprobacionNegocio(CORREO, "Ana", "Tienda");
        sender.enviarRechazoNegocio(CORREO, "Ana", "Tienda", "m");
        sender.enviarInvitacionMiembro(CORREO, "Ana", "EDITOR", "Tienda", null);
        sender.enviarAltaEmprendedorAdmin(ADMIN, "Tienda", CORREO, false, null);
        sender.enviarModeracionAprobada(CORREO, "Ana", "Producto", "x");
        sender.enviarModeracionRechazada(CORREO, "Ana", "Producto", "x", "m");
        sender.enviarResenaResultado(CORREO, "Ana", true, "x");
        sender.enviarProductoModerado(CORREO, "Ana", "x", true, "n");
        sender.enviarCambioCobroPendiente(CORREO, "Ana", "IBAN", "****1");
    }

    private void sinPii(int esperados) {
        assertThat(appender.list).hasSize(esperados);
        for (ILoggingEvent ev : appender.list) {
            assertThat(ev.getFormattedMessage()).doesNotContain(CORREO).doesNotContain(ADMIN);
        }
    }

    @Test
    void envioOk_sinCorreo() {
        todos();
        sinPii(6);
    }

    @Test
    void envioFallido_sinCorreoNiMensajeDelProveedor() {
        doThrow(new IllegalStateException("Resend rechazó " + CORREO))
            .when(resend).send(anyString(), any(), any());
        todos();
        sinPii(11);
    }
}
