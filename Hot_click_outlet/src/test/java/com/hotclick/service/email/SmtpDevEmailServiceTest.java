package com.hotclick.service.email;

import com.hotclick.service.ResendEmailService;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetup;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

/** Selección del sender por perfil (fail-closed hacia SendGrid) y envío real a SMTP en memoria. */
class SmtpDevEmailServiceTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(new ServerSetup(0, "127.0.0.1", "smtp"));

    private static AnnotationConfigApplicationContext contexto(String... perfiles) {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        MockEnvironment env = new MockEnvironment()
            .withProperty("sendgrid.api-key", "SG.no-real")
            .withProperty("sendgrid.from-email", "no-reply@hotclick.lat")
            .withProperty("sendgrid.from-name", "HOTCLICK");
        env.setActiveProfiles(perfiles);
        ctx.setEnvironment(env);
        ctx.register(ResendEmailService.class, SmtpDevEmailService.class);
        ctx.refresh();
        return ctx;
    }

    @Test
    void conPerfilDevSeEligeSmtpApuntandoALocalhost1025() {
        try (var ctx = contexto("dev")) {
            ResendEmailService bean = ctx.getBean(ResendEmailService.class);
            assertThat(bean).isInstanceOf(SmtpDevEmailService.class);
            SmtpDevEmailService smtp = (SmtpDevEmailService) bean;
            assertThat(smtp.getMailSender().getHost()).isEqualTo("localhost");
            assertThat(smtp.getMailSender().getPort()).isEqualTo(1025);
            assertThat(smtp.getMailSender().getUsername()).isNull();
        }
    }

    @Test
    void conPerfilTestSeEligeSmtp() {
        try (var ctx = contexto("test")) {
            assertThat(ctx.getBean(ResendEmailService.class)).isInstanceOf(SmtpDevEmailService.class);
        }
    }

    @Test
    void enProdYCombinacionesConProdSiempreSendGrid() {
        String[][] casos = { {"prod"}, {"production"}, {"dev", "prod"}, {"test", "production"},
                             {"dev", "test", "prod"}, {}, {"staging"} };
        for (String[] perfiles : casos) {
            try (var ctx = contexto(perfiles)) {
                assertThat(ctx.getBeansOfType(SmtpDevEmailService.class)).isEmpty();
                assertThat(ctx.getBean(ResendEmailService.class).getClass()).isEqualTo(ResendEmailService.class);
            }
        }
    }

    @Test
    void envioRealAServidorSmtpEnMemoria() throws Exception {
        SmtpDevEmailService smtp = new SmtpDevEmailService("127.0.0.1", greenMail.getSmtp().getPort(),
            "no-reply@hotclick.lat", "HOTCLICK");
        smtp.send("cliente@ejemplo.cr", "Probá el correo", "<p>¡Hola, mae!</p>");
        MimeMessage[] recibidos = greenMail.getReceivedMessages();
        assertThat(recibidos).hasSize(1);
        assertThat(recibidos[0].getSubject()).isEqualTo("Probá el correo");
        assertThat(recibidos[0].getAllRecipients()[0].toString()).isEqualTo("cliente@ejemplo.cr");
    }
}
