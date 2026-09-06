package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * SMS vía Twilio. Sin SID/token/from en env → no envía (el caller usa WhatsApp/email).
 */
@Component
public class TwilioSmsClient {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsClient.class);
    private static final String URL = "https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json";

    private final RestTemplate restTemplate;
    private final String accountSid;
    private final String authToken;
    private final String fromNumber;

    public TwilioSmsClient(
            RestTemplate restTemplate,
            @Value("${twilio.account-sid:}") String accountSid,
            @Value("${twilio.auth-token:}") String authToken,
            @Value("${twilio.from-number:}") String fromNumber) {
        this.restTemplate = restTemplate;
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
    }

    public boolean configurado() {
        return notBlank(accountSid) && notBlank(authToken) && notBlank(fromNumber);
    }

    public boolean enviar(String destinoE164, String texto) {
        if (!configurado() || !notBlank(destinoE164) || !notBlank(texto)) {
            return false;
        }
        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(
                    String.format(URL, accountSid),
                    new HttpEntity<>(formulario(destinoE164, texto), headers()),
                    String.class);
            return resp.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.error("[twilio-sms] no se pudo avisar el cambio de cobro: {}", e.getMessage());
            return false;
        }
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(accountSid, authToken);
        return headers;
    }

    private MultiValueMap<String, String> formulario(String destinoE164, String texto) {
        String to = destinoE164.startsWith("+") ? destinoE164 : "+" + destinoE164;
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("To", to);
        form.add("From", fromNumber);
        form.add("Body", texto);
        return form;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
