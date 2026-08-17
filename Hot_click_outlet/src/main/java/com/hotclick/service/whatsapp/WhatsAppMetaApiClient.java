package com.hotclick.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
class WhatsAppMetaApiClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppMetaApiClient.class);
    private static final String META_URL = "https://graph.facebook.com/v19.0/%s/messages";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${whatsapp.phone-id:}")
    private String phoneId;

    @Value("${whatsapp.token:}")
    private String token;

    boolean credencialesConfiguradas() {
        return phoneId != null && !phoneId.isBlank() && token != null && !token.isBlank();
    }

    String llamarMetaApi(String telefono, String texto) {
        Map<String, Object> body = Map.of(
            "messaging_product", "whatsapp",
            "to",                telefono,
            "type",              "text",
            "text",              Map.of("body", texto, "preview_url", false)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String url = String.format(META_URL, phoneId);
        ResponseEntity<String> resp = httpClient().exchange(
            url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);

        if (!resp.getStatusCode().is2xxSuccessful())
            throw new IntegracionExternaException("meta-whatsapp", IntegracionExternaException.Tipo.IO_ERROR,
                "Meta API status " + resp.getStatusCode());

        try {
            JsonNode node = JSON.readTree(resp.getBody());
            JsonNode msgs = node.path("messages");
            if (msgs.isArray() && msgs.size() > 0)
                return msgs.get(0).path("id").asText("");
        } catch (Exception e) { log.debug("meta response parse error: {}", e.getMessage()); }
        return "ok";
    }

    private static RestTemplate httpClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory f =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        return new RestTemplate(f);
    }
}
