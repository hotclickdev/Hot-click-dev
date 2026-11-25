package com.hotclick.agente.conexion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Llamadas a Graph API para conectar cuentas. Siempre del servidor (el secreto de la app y los tokens nunca van
 * al navegador), con timeout de conexión y lectura. El secreto viaja en el cuerpo POST, no en la URL. Los errores
 * se traducen sin cuerpo ni URL (podrían traer tokens): 4xx cae en {@link MetaRechazoException}; red, 5xx o
 * respuesta inválida en {@link IntegracionExternaException} (cuenta para el circuit breaker "meta-graph").
 */
@Component
public class MetaGraphCliente {

    private static final Logger log = LoggerFactory.getLogger(MetaGraphCliente.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    static final String INTEGRACION = "meta-graph";

    /** Página con su token (solo en memoria del servidor). */
    public record PaginaMeta(String id, String nombre, String token, String instagramId, String instagramUsuario) {
        @Override public String toString() { return "PaginaMeta[" + id + "]"; }
    }

    private final MetaConexionConfig config;
    private final RestTemplate http;

    @Autowired
    public MetaGraphCliente(MetaConexionConfig config) {
        this(config, nuevoCliente());
    }

    MetaGraphCliente(MetaConexionConfig config, RestTemplate http) {
        this.config = config;
        this.http = http;
    }

    private String base() {
        return "https://graph.facebook.com/" + config.graphVersion() + "/";
    }

    /** Embedded Signup: cambia el código (vive 5 minutos) por el token de negocio. */
    @CircuitBreaker(name = INTEGRACION)
    public String intercambiarCodigo(String code) {
        MultiValueMap<String, String> f = new LinkedMultiValueMap<>();
        f.add("client_id", config.appId());
        f.add("client_secret", config.appSecret());
        f.add("code", code);
        return token(llamar(base() + "oauth/access_token", HttpMethod.POST, null, f));
    }

    /** Token de usuario de corta vida a larga duración (con él, los tokens de página no vencen). */
    @CircuitBreaker(name = INTEGRACION)
    public String tokenLargaDuracion(String tokenUsuario) {
        MultiValueMap<String, String> f = new LinkedMultiValueMap<>();
        f.add("grant_type", "fb_exchange_token");
        f.add("client_id", config.appId());
        f.add("client_secret", config.appSecret());
        f.add("fb_exchange_token", tokenUsuario);
        return token(llamar(base() + "oauth/access_token", HttpMethod.POST, null, f));
    }

    /** Nombre verificado del número; también prueba que el token tiene acceso a ese número. */
    @CircuitBreaker(name = INTEGRACION)
    public String nombreDelNumero(String phoneNumberId, String token) {
        JsonNode n = llamar(base() + phoneNumberId + "?fields=verified_name", HttpMethod.GET, token, null);
        return n.path("verified_name").asText("");
    }

    /** Suscribe la app a los webhooks de la WABA. */
    @CircuitBreaker(name = INTEGRACION)
    public void suscribirWaba(String wabaId, String token) {
        exigirExito(llamar(base() + wabaId + "/subscribed_apps", HttpMethod.POST, token, new LinkedMultiValueMap<>()));
    }

    /** Registra el número en la Cloud API con un PIN de dos pasos de 6 dígitos. */
    @CircuitBreaker(name = INTEGRACION)
    public void registrarNumero(String phoneNumberId, String token, String pin) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(token);
        Map<String, String> cuerpo = Map.of("messaging_product", "whatsapp", "pin", pin);
        exigirExito(ejecutar(base() + phoneNumberId + "/register", HttpMethod.POST, new HttpEntity<>(cuerpo, h)));
    }

    /** Páginas que administra el usuario y la cuenta de Instagram vinculada a cada una (con token de página). */
    @CircuitBreaker(name = INTEGRACION)
    public List<PaginaMeta> paginas(String tokenUsuarioLargo) {
        JsonNode n = llamar(base() + "me/accounts?limit=100&fields=id,name,access_token,"
            + "instagram_business_account%7Bid,username%7D", HttpMethod.GET, tokenUsuarioLargo, null);
        List<PaginaMeta> out = new ArrayList<>();
        for (JsonNode p : n.path("data")) {
            String id = p.path("id").asText("");
            String tok = p.path("access_token").asText("");
            if (id.isEmpty() || tok.isEmpty()) continue;
            JsonNode ig = p.path("instagram_business_account");
            out.add(new PaginaMeta(id, p.path("name").asText(""), tok,
                ig.path("id").asText(null), ig.path("username").asText(null)));
        }
        return out;
    }

    /** Suscribe la página a los campos de mensajes (Messenger e Instagram comparten la suscripción de la página). */
    @CircuitBreaker(name = INTEGRACION)
    public void suscribirPagina(String paginaId, String tokenPagina) {
        MultiValueMap<String, String> f = new LinkedMultiValueMap<>();
        f.add("subscribed_fields", "messages,messaging_postbacks");
        exigirExito(llamar(base() + paginaId + "/subscribed_apps", HttpMethod.POST, tokenPagina, f));
    }

    // ── interno ──────────────────────────────────────────────────────────────

    private JsonNode llamar(String url, HttpMethod m, String bearer, MultiValueMap<String, String> form) {
        HttpHeaders h = new HttpHeaders();
        if (bearer != null) h.setBearerAuth(bearer);
        if (form != null) h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        return ejecutar(url, m, form == null ? new HttpEntity<>(h) : new HttpEntity<>(form, h));
    }

    private JsonNode ejecutar(String url, HttpMethod m, HttpEntity<?> entidad) {
        try {
            String cuerpo = http.exchange(url, m, entidad, String.class).getBody();
            return cuerpo == null || cuerpo.isBlank() ? JSON.createObjectNode() : JSON.readTree(cuerpo);
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            log.warn("[conexion-meta] Graph respondió HTTP {}", status);
            if (status >= 400 && status < 500 && status != 429) throw new MetaRechazoException(codigoMeta(e, status));
            throw new IntegracionExternaException(INTEGRACION,
                status == 429 ? IntegracionExternaException.Tipo.RATE_LIMIT : IntegracionExternaException.Tipo.IO_ERROR,
                "Graph HTTP " + status);
        } catch (ResourceAccessException e) {
            // El mensaje trae la URL: no se propaga.
            log.warn("[conexion-meta] sin respuesta de Graph");
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.TIMEOUT, "Graph sin respuesta");
        } catch (Exception e) {
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Respuesta de Graph no interpretable");
        }
    }

    /** Código numérico de error de Meta si viene; nunca el texto. */
    private static int codigoMeta(HttpStatusCodeException e, int status) {
        try {
            return JSON.readTree(e.getResponseBodyAsString()).path("error").path("code").asInt(status);
        } catch (Exception ex) {
            return status;
        }
    }

    private static String token(JsonNode n) {
        String t = n.path("access_token").asText("");
        if (t.isEmpty()) {
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Graph no devolvió token");
        }
        return t;
    }

    private static void exigirExito(JsonNode n) {
        if (!n.path("success").asBoolean(false)) {
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "Graph no confirmó la operación");
        }
    }

    private static RestTemplate nuevoCliente() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(15_000);
        return new RestTemplate(f);
    }
}
