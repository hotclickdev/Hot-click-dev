package com.hotclick.service;

import com.hotclick.exception.IntegracionExternaException;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Envío de correo con selector de proveedor.
 * <ul>
 *   <li>{@code mail.provider} ausente o {@code sendgrid}: SendGrid (comportamiento histórico).</li>
 *   <li>{@code mail.provider=smtp}: JavaMailSender; exige {@code spring.mail.host}.</li>
 *   <li>{@code mail.provider=noop}: no envía nada; solo loguea destinatario enmascarado y asunto (dev/local).</li>
 * </ul>
 * SendGrid con {@code sendgrid.api-key} vacía: solo cae a noop (con warning) si hay un perfil activo
 * dev, test o local y ninguno prod/production. En cualquier otro caso (prod, staging, sin perfil…)
 * falla al arrancar. {@code mail.provider=noop} explícito con perfil prod/production también falla.
 * Fail closed: valor desconocido o smtp sin host lanzan IllegalStateException al arrancar
 * (y también en send()). Nunca cae al otro proveedor.
 */
@Service
public class ResendEmailService {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);

    public enum Provider { SENDGRID, SMTP, NOOP }

    @Value("${sendgrid.api-key}")
    private String apiKey;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Value("${sendgrid.from-name}")
    private String fromName;

    @Value("${mail.provider:sendgrid}")
    private String providerRaw = "sendgrid";

    @Value("${spring.mail.host:}")
    private String smtpHost = "";

    @Autowired(required = false)
    private ObjectProvider<JavaMailSender> mailSenderProvider;

    @Autowired(required = false)
    private Environment environment;

    private volatile Provider provider;

    @PostConstruct
    void validarConfiguracion() {
        provider = resolverProveedor();
    }

    Provider resolverProveedor() {
        String v = providerRaw == null ? "" : providerRaw.trim().toLowerCase(Locale.ROOT);
        if (v.equals("noop")) {
            if (esProduccion()) {
                throw new IllegalStateException("mail.provider=noop no está permitido en producción");
            }
            return Provider.NOOP;
        }
        if (v.isEmpty() || v.equals("sendgrid")) {
            if (apiKey == null || apiKey.isBlank()) {
                if (!perfilNoopPermitido()) {
                    throw new IllegalStateException(
                        "mail.provider=sendgrid requiere sendgrid.api-key fuera de los perfiles dev, test o local");
                }
                log.warn("sendgrid.api-key vacía en perfil dev/test/local: se usa mail.provider=noop (no se envían correos)");
                return Provider.NOOP;
            }
            return Provider.SENDGRID;
        }
        if (v.equals("smtp")) {
            if (smtpHost == null || smtpHost.isBlank()) {
                throw new IllegalStateException("mail.provider=smtp requiere spring.mail.host");
            }
            if (mailSenderProvider == null || mailSenderProvider.getIfAvailable() == null) {
                throw new IllegalStateException("mail.provider=smtp sin JavaMailSender configurado");
            }
            return Provider.SMTP;
        }
        throw new IllegalStateException("mail.provider desconocido: " + providerRaw);
    }

    private static final java.util.Set<String> PERFILES_NOOP = java.util.Set.of("dev", "test", "local");

    /** Fail-closed: hace falta un perfil dev|test|local activo y ninguno prod/production. Sin perfil: false. */
    private boolean perfilNoopPermitido() {
        if (environment == null || esProduccion()) return false;
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (PERFILES_NOOP.contains(n)) return true;
        }
        return false;
    }

    private boolean esProduccion() {
        if (environment == null) return false;
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) return true;
        }
        return false;
    }

    public Provider getProvider() {
        if (provider == null) {
            provider = resolverProveedor();
        }
        return provider;
    }

    public void send(String to, String subject, String html) {
        Provider p = getProvider();
        if (p == Provider.NOOP) {
            log.info("mail.provider=noop: correo no enviado a={} asunto={}", enmascararCorreo(to), subject);
        } else if (p == Provider.SMTP) {
            sendSmtp(to, subject, html);
        } else {
            sendSendGrid(to, subject, html);
        }
    }

    private void sendSmtp(String to, String subject, String html) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new IllegalStateException("mail.provider=smtp sin JavaMailSender configurado");
        }
        try {
            MimeMessage msg = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromEmail, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(msg);
        } catch (Exception e) {
            throw new IntegracionExternaException("smtp", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al enviar el correo. Intentá de nuevo en unos minutos.", e);
        }
    }

    private void sendSendGrid(String to, String subject, String html) {
        Mail mail = new Mail(
            new Email(fromEmail, fromName),
            subject,
            new Email(to),
            new Content("text/html", html)
        );

        SendGrid sg = newSendGrid(apiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
                throw new IntegracionExternaException("sendgrid", IntegracionExternaException.Tipo.IO_ERROR,
                    "SendGrid respondió " + response.getStatusCode());
            }
        } catch (IntegracionExternaException e) {
            throw e;
        } catch (Exception e) {
            throw new IntegracionExternaException("sendgrid", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al enviar el correo. Intentá de nuevo en unos minutos.", e);
        }
    }

    static String enmascararCorreo(String correo) {
        if (correo == null || correo.isBlank()) return "";
        int at = correo.indexOf('@');
        if (at <= 0) return "***";
        return correo.charAt(0) + "***" + correo.substring(at);
    }

    /** Punto de extensión para tests. */
    SendGrid newSendGrid(String key) {
        return new SendGrid(key);
    }
}
