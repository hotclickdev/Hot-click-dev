package com.hotclick.service;

import com.hotclick.exception.IntegracionExternaException;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MailProviderSelectorTest {

    private SendGrid sg = mock(SendGrid.class);
    private JavaMailSender jms = mock(JavaMailSender.class);

    @SuppressWarnings("unchecked")
    private ResendEmailService build(String provider, String host, boolean withSender) throws Exception {
        ResendEmailService s = spy(new ResendEmailService());
        ReflectionTestUtils.setField(s, "apiKey", "SG.test-not-real");
        ReflectionTestUtils.setField(s, "fromEmail", "no-reply@example.test");
        ReflectionTestUtils.setField(s, "fromName", "HOTCLICK");
        ReflectionTestUtils.setField(s, "providerRaw", provider);
        ReflectionTestUtils.setField(s, "smtpHost", host);
        ObjectProvider<JavaMailSender> op = mock(ObjectProvider.class);
        when(op.getIfAvailable()).thenReturn(withSender ? jms : null);
        ReflectionTestUtils.setField(s, "mailSenderProvider", op);
        doReturn(sg).when(s).newSendGrid(any());
        Response ok = new Response(202, "", java.util.Map.of());
        when(sg.api(any(Request.class))).thenReturn(ok);
        when(jms.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        return s;
    }


    @Test
    void defaultSinPropiedadEsSendGrid() throws Exception {
        ResendEmailService s = build(null, "", false);
        s.validarConfiguracion();
        assertThat(s.getProvider()).isEqualTo(ResendEmailService.Provider.SENDGRID);
        s.send("a@example.test", "Hola", "<p>x</p>");
        verify(sg).api(any(Request.class));
        verify(jms, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendgridExplicitoIgnoraSmtpAunqueHayaHost() throws Exception {
        ResendEmailService s = build("SendGrid", "localhost", true);
        s.validarConfiguracion();
        s.send("a@example.test", "Hola", "<p>x</p>");
        verify(sg).api(any(Request.class));
        verify(jms, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendgridErrorSigueLanzandoIntegracionExterna() throws Exception {
        ResendEmailService s = build("sendgrid", "", false);
        when(sg.api(any(Request.class))).thenReturn(new Response(401, "unauthorized", java.util.Map.of()));
        assertThatThrownBy(() -> s.send("a@example.test", "Hola", "<p>x</p>"))
            .isInstanceOf(IntegracionExternaException.class);
        verify(jms, never()).send(any(MimeMessage.class));
    }

    @Test
    void smtpConfiguradoEnviaPorJavaMailSenderYNoPorSendGrid() throws Exception {
        ResendEmailService s = build("smtp", "localhost", true);
        s.validarConfiguracion();
        assertThat(s.getProvider()).isEqualTo(ResendEmailService.Provider.SMTP);
        s.send("a@example.test", "Asunto", "<p>codigo</p>");
        ArgumentCaptor<MimeMessage> cap = ArgumentCaptor.forClass(MimeMessage.class);
        verify(jms).send(cap.capture());
        assertThat(cap.getValue().getSubject()).isEqualTo("Asunto");
        assertThat(cap.getValue().getAllRecipients()[0].toString()).isEqualTo("a@example.test");
        verify(sg, never()).api(any(Request.class));
    }

    @Test
    void smtpSinHostFallaCerrado() throws Exception {
        ResendEmailService s = build("smtp", "", true);
        assertThatThrownBy(s::validarConfiguracion).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> s.send("a@example.test", "x", "y")).isInstanceOf(IllegalStateException.class);
        verify(sg, never()).api(any(Request.class));
        verify(jms, never()).send(any(MimeMessage.class));
    }

    @Test
    void smtpSinJavaMailSenderFallaCerrado() throws Exception {
        ResendEmailService s = build("smtp", "localhost", false);
        assertThatThrownBy(s::validarConfiguracion).isInstanceOf(IllegalStateException.class);
        verify(sg, never()).api(any(Request.class));
    }

    @Test
    void proveedorDesconocidoFallaCerrado() throws Exception {
        ResendEmailService s = build("mailgun", "localhost", true);
        assertThatThrownBy(s::validarConfiguracion).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> s.send("a@example.test", "x", "y")).isInstanceOf(IllegalStateException.class);
        verify(sg, never()).api(any(Request.class));
        verify(jms, never()).send(any(MimeMessage.class));
    }

    private ResendEmailService conPerfilYKey(String provider, String key, String... perfiles) throws Exception {
        ResendEmailService s = build(provider, "", false);
        ReflectionTestUtils.setField(s, "apiKey", key);
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(perfiles);
        ReflectionTestUtils.setField(s, "environment", env);
        return s;
    }

    @Test
    void noopNoEnviaNiPorSendGridNiPorSmtp() throws Exception {
        ResendEmailService s = build("noop", "localhost", true);
        s.validarConfiguracion();
        assertThat(s.getProvider()).isEqualTo(ResendEmailService.Provider.NOOP);
        s.send("ana@example.test", "Hola", "<p>secreto</p>");
        verify(sg, never()).api(any(Request.class));
        verify(jms, never()).send(any(MimeMessage.class));
    }

    @Test
    void enmascaraCorreoSinExponerUsuario() {
        assertThat(ResendEmailService.enmascararCorreo("ana.perez@example.test")).isEqualTo("a***@example.test");
        assertThat(ResendEmailService.enmascararCorreo("sinarroba")).isEqualTo("***");
        assertThat(ResendEmailService.enmascararCorreo(null)).isEmpty();
    }

    @Test
    void sendgridSinKeyEnProdFallaAlArrancar() throws Exception {
        for (String perfil : new String[] {"prod", "production"}) {
            ResendEmailService s = conPerfilYKey("sendgrid", "", perfil);
            assertThatThrownBy(s::validarConfiguracion).isInstanceOf(IllegalStateException.class);
        }
        ResendEmailService s = conPerfilYKey(null, "  ", "prod");
        assertThatThrownBy(s::validarConfiguracion).isInstanceOf(IllegalStateException.class);
        verify(sg, never()).api(any(Request.class));
    }

    @Test
    void sendgridSinKeyFueraDeProdCaeANoop() throws Exception {
        ResendEmailService s = conPerfilYKey("sendgrid", "", "dev");
        s.validarConfiguracion();
        assertThat(s.getProvider()).isEqualTo(ResendEmailService.Provider.NOOP);
        s.send("a@example.test", "Hola", "<p>x</p>");
        verify(sg, never()).api(any(Request.class));
    }

    @Test
    void sendgridConKeyEnProdSigueSiendoSendGrid() throws Exception {
        ResendEmailService s = conPerfilYKey("sendgrid", "SG.test-not-real", "prod");
        s.validarConfiguracion();
        assertThat(s.getProvider()).isEqualTo(ResendEmailService.Provider.SENDGRID);
    }

    @Test
    void errorDeSendGridNoIncluyeCuerpoDeRespuesta() throws Exception {
        ResendEmailService s = build("sendgrid", "", false);
        when(sg.api(any(Request.class))).thenReturn(
            new Response(401, "{\"errors\":[{\"message\":\"cuerpo-sensible-xyz\"}]}", java.util.Map.of()));
        assertThatThrownBy(() -> s.send("a@example.test", "Hola", "<p>x</p>"))
            .isInstanceOf(IntegracionExternaException.class)
            .hasMessageContaining("401")
            .hasMessageNotContaining("cuerpo-sensible-xyz")
            .hasMessageNotContaining("errors");
    }

    @Test
    void perfilDevUsaNoopPorDefecto() throws Exception {
        Properties p = new Properties();
        try (var in = getClass().getResourceAsStream("/application-dev.properties")) {
            p.load(in);
        }
        assertThat(p.getProperty("mail.provider")).isEqualTo("${MAIL_PROVIDER:noop}");
    }
}
