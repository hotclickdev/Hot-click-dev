package com.hotclick.agente.canal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Envío por Graph API con el token de la cuenta: WhatsApp en {@code /{phone_number_id}/messages}; Instagram y
 * Messenger por el Send API en {@code /me/messages} (el token de página resuelve "me"). Sin token → simulado.
 */
@Component
public class MetaCanalMensajeria implements CanalMensajeria {

    private static final Logger log = LoggerFactory.getLogger(MetaCanalMensajeria.class);
    static final String GRAPH = "https://graph.facebook.com/v19.0/";
    static final int MAX_WHATSAPP = 4096;
    static final int MAX_SOCIAL = 1000;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final CanalCuentaService cuentas;
    private final RestTemplate http;

    @org.springframework.beans.factory.annotation.Autowired
    public MetaCanalMensajeria(CanalCuentaService cuentas) {
        this(cuentas, nuevoCliente());
    }

    MetaCanalMensajeria(CanalCuentaService cuentas, RestTemplate http) {
        this.cuentas = cuentas;
        this.http = http;
    }

    @Override
    public String enviarTexto(CanalCuenta cuenta, String destinatario, String texto) {
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA)
            throw new IllegalStateException("La cuenta del canal no está activa");
        if (destinatario == null || destinatario.isBlank() || texto == null || texto.isBlank())
            throw new IllegalArgumentException("destinatario y texto son obligatorios");

        String token = cuentas.tokenDe(cuenta);
        if (token == null || token.isBlank()) {
            log.info("[canal] modo simulado (cuenta {} sin token): mensaje no enviado", cuenta.getId());
            return "simulado";
        }
        boolean wa = cuenta.getTipo() == MensajeEntrante.Canal.WHATSAPP;
        String cuerpoTexto = recortar(texto, wa ? MAX_WHATSAPP : MAX_SOCIAL);
        String url = wa ? GRAPH + cuenta.getIdExterno() + "/messages" : GRAPH + "me/messages";
        Map<String, Object> body = wa
            ? Map.of("messaging_product", "whatsapp", "to", destinatario, "type", "text",
                     "text", Map.of("body", cuerpoTexto, "preview_url", false))
            : Map.of("recipient", Map.of("id", destinatario), "messaging_type", "RESPONSE",
                     "message", Map.of("text", cuerpoTexto));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        String resp = http.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class).getBody();
        return idDeRespuesta(resp, wa);
    }

    static String recortar(String t, int max) {
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }

    private static String idDeRespuesta(String resp, boolean wa) {
        try {
            JsonNode n = JSON.readTree(resp);
            if (wa) {
                JsonNode m = n.path("messages");
                if (m.isArray() && m.size() > 0) return m.get(0).path("id").asText("ok");
            } else {
                String id = n.path("message_id").asText("");
                if (!id.isEmpty()) return id;
            }
        } catch (Exception e) {
            log.debug("[canal] respuesta de Meta no interpretable");
        }
        return "ok";
    }

    private static RestTemplate nuevoCliente() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        return new RestTemplate(f);
    }
}
