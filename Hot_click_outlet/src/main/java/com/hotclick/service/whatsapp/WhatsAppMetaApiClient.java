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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cliente de la Cloud API de Meta (WhatsApp). Envía texto libre (solo válido dentro de la
 * ventana de 24 h) o plantillas aprobadas. Timeouts de 5 s (conexión) y 10 s (lectura).
 * Modo de fallo: si Meta cae o rechaza, se lanza excepción y el sender deja el registro en ERROR;
 * no hay reintento automático para no duplicar avisos.
 */
@Component
class WhatsAppMetaApiClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppMetaApiClient.class);
    private static final String META_URL = "https://graph.facebook.com/%s/%s/messages";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${whatsapp.phone-id:}")
    private String phoneId;

    @Value("${whatsapp.token:}")
    private String token;

    /** Versión del Graph API. Meta retira versiones antiguas: revisar al menos cada 6 meses. */
    @Value("${whatsapp.graph-version:v19.0}")
    private String graphVersion;

    boolean credencialesConfiguradas() {
        return phoneId != null && !phoneId.isBlank() && token != null && !token.isBlank();
    }

    String llamarMetaApi(String telefono, String texto) {
        Map<String, Object> body = construirCuerpoTexto(telefono, texto);
        return enviar(body);
    }

    /** Envía una plantilla aprobada con los parámetros del cuerpo ({{1}}...{{n}}). */
    String llamarMetaApiPlantilla(String telefono, PlantillaMeta plantilla, List<String> parametros) {
        return enviar(construirCuerpoPlantilla(telefono, plantilla, parametros));
    }

    static Map<String, Object> construirCuerpoTexto(String telefono, String texto) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", telefono);
        body.put("type", "text");
        body.put("text", Map.of("body", texto, "preview_url", false));
        return body;
    }

    /**
     * JSON de una plantilla: {@code type:"template"}, nombre, idioma y componente body con un
     * parámetro de texto por variable. Si en el futuro una plantilla lleva botón URL, se agrega un
     * componente {@code button/sub_type:url/index:0} con su sufijo.
     */
    static Map<String, Object> construirCuerpoPlantilla(String telefono, PlantillaMeta plantilla,
                                                         List<String> parametros) {
        List<Map<String, Object>> params = new ArrayList<>();
        for (String p : parametros) {
            Map<String, Object> param = new LinkedHashMap<>();
            param.put("type", "text");
            param.put("text", p);
            params.add(param);
        }
        List<Map<String, Object>> componentes = new ArrayList<>();
        if (!params.isEmpty()) {
            Map<String, Object> bodyComp = new LinkedHashMap<>();
            bodyComp.put("type", "body");
            bodyComp.put("parameters", params);
            componentes.add(bodyComp);
        }
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", plantilla.nombreTecnico);
        template.put("language", Map.of("code", PlantillaMeta.IDIOMA));
        template.put("components", componentes);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", telefono);
        body.put("type", "template");
        body.put("template", template);
        return body;
    }

    private String enviar(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String url = String.format(META_URL, graphVersion, phoneId);
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
