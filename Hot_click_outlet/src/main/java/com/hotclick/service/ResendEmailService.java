package com.hotclick.service;

import com.hotclick.exception.IntegracionExternaException;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResendEmailService {

    @Value("${sendgrid.api-key}")
    private String apiKey;

    @Value("${sendgrid.from-email}")
    private String fromEmail;

    @Value("${sendgrid.from-name}")
    private String fromName;

    public void send(String to, String subject, String html) {
        Mail mail = new Mail(
            new Email(fromEmail, fromName),
            subject,
            new Email(to),
            new Content("text/html", html)
        );

        SendGrid sg = new SendGrid(apiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
                throw new IntegracionExternaException("sendgrid", IntegracionExternaException.Tipo.IO_ERROR,
                    "SendGrid respondió " + response.getStatusCode() + ": " + response.getBody());
            }
        } catch (IntegracionExternaException e) {
            throw e;
        } catch (Exception e) {
            throw new IntegracionExternaException("sendgrid", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al enviar el correo. Intentá de nuevo en unos minutos.", e);
        }
    }
}
