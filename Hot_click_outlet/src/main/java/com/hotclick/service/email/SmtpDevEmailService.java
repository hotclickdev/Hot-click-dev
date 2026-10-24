package com.hotclick.service.email;

import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.service.ResendEmailService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * Envío de correo por SMTP SOLO para desarrollo y QA local (Mailpit en localhost:1025).
 * Sin autenticación ni TLS, sin secretos. Nunca se activa si prod o production están activos.
 * No se conecta al arrancar: la conexión se abre solo al enviar.
 */
@Service
@Profile("(dev | test) & !prod & !production")
public class SmtpDevEmailService extends ResendEmailService {

    private final JavaMailSenderImpl mailSender;
    private final String from;
    private final String fromName;

    public SmtpDevEmailService(
            @Value("${hotclick.mail.dev.host:localhost}") String host,
            @Value("${hotclick.mail.dev.port:1025}") int port,
            @Value("${sendgrid.from-email:no-reply@hotclick.lat}") String from,
            @Value("${sendgrid.from-name:HOTCLICK}") String fromName) {
        JavaMailSenderImpl s = new JavaMailSenderImpl();
        s.setHost(host);
        s.setPort(port);
        s.setDefaultEncoding(StandardCharsets.UTF_8.name());
        Properties p = s.getJavaMailProperties();
        p.put("mail.transport.protocol", "smtp");
        p.put("mail.smtp.auth", "false");
        p.put("mail.smtp.starttls.enable", "false");
        p.put("mail.smtp.connectiontimeout", "5000");
        p.put("mail.smtp.timeout", "5000");
        this.mailSender = s;
        this.from = from;
        this.fromName = fromName;
    }

    public JavaMailSenderImpl getMailSender() {
        return mailSender;
    }

    @Override
    public void send(String to, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            h.setFrom(from, fromName);
            h.setTo(to);
            h.setSubject(subject);
            h.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            throw new IntegracionExternaException("smtp-dev", IntegracionExternaException.Tipo.IO_ERROR,
                "No se pudo enviar el correo por SMTP local. Revisá que Mailpit esté corriendo en "
                    + mailSender.getHost() + ":" + mailSender.getPort() + ".", e);
        }
    }
}
