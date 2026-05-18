package com.hotclick.service;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ResendEmailService {

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${resend.from-address}")
    private String fromAddress;

    public void send(String to, String subject, String html) {
        Resend resend = new Resend(apiKey);

        CreateEmailOptions request = CreateEmailOptions.builder()
            .from(fromAddress)
            .to(List.of(to))
            .subject(subject)
            .html(html)
            .build();

        try {
            resend.emails().send(request);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar el correo. Intentá de nuevo en unos minutos.", e);
        }
    }
}
