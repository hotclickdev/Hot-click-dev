package com.hotclick.agente.voz;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Transcriptor de notas de voz con la API de OpenAI ({@code POST {base}/audio/transcriptions}). Sirve para Groq
 * (gratis, por defecto) y para Whisper autohospedado (speaches y similares). Se activa con
 * {@code agente.voz.proveedor=openai-compatible}.
 *
 * <p>Reglas: la base URL debe ser https; solo se acepta http si el host es {@code localhost}, {@code 127.0.0.1} o
 * {@code ::1} (autohospedado en la misma máquina). Si no cumple, el bean queda deshabilitado (el bot pide texto).
 * Sin clave, también deshabilitado. Timeout de {@link VozConfig}, sin reintentos ni redirecciones. La duración se
 * lee de la respuesta ({@code verbose_json}) y, si supera el máximo, se rechaza. Nunca se registran el audio, el
 * texto, la clave ni el cuerpo de las respuestas de error.
 */
@Component
@ConditionalOnProperty(name = "agente.voz.proveedor", havingValue = "openai-compatible")
public class TranscriptorOpenAiCompatible implements TranscriptorVoz {

    private static final Logger log = LoggerFactory.getLogger(TranscriptorOpenAiCompatible.class);

    static final String BASE_POR_DEFECTO = "https://api.groq.com/openai/v1";
    static final String MODELO_POR_DEFECTO = "whisper-large-v3-turbo";

    private static final Map<String, String> EXTENSIONES = Map.of(
        "audio/ogg", "ogg", "audio/mpeg", "mp3", "audio/mp4", "m4a", "audio/aac", "m4a",
        "audio/amr", "amr", "audio/wav", "wav", "audio/x-wav", "wav", "audio/webm", "webm");

    private final VozConfig config;
    private final String apiKey;
    private final String modelo;
    private final URI endpoint; // null si la base URL no es válida
    private final RestTemplate http;
    private final ObjectMapper json = new ObjectMapper();

    @Autowired
    public TranscriptorOpenAiCompatible(VozConfig config,
                                        @Value("${agente.voz.base-url:" + BASE_POR_DEFECTO + "}") String baseUrl,
                                        @Value("${agente.voz.api-key:}") String apiKey,
                                        @Value("${agente.voz.modelo:" + MODELO_POR_DEFECTO + "}") String modelo) {
        this(config, baseUrl, apiKey, modelo, nuevoCliente(config));
    }

    TranscriptorOpenAiCompatible(VozConfig config, String baseUrl, String apiKey, String modelo, RestTemplate http) {
        this.config = config;
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.modelo = (modelo == null || modelo.isBlank()) ? MODELO_POR_DEFECTO : modelo.strip();
        this.http = http;
        URI e = null;
        try {
            e = endpointDe(baseUrl == null || baseUrl.isBlank() ? BASE_POR_DEFECTO : baseUrl);
        } catch (IllegalArgumentException ex) {
            log.error("[agente-voz] base URL del transcriptor rechazada: {}", ex.getMessage());
        }
        this.endpoint = e;
        if (this.apiKey.isEmpty()) log.warn("[agente-voz] proveedor openai-compatible sin clave: voz deshabilitada");
    }

    /** https obligatorio; http solo hacia localhost/127.0.0.1/::1. Sin credenciales en la URL. */
    static URI endpointDe(String baseUrl) {
        URI uri;
        try {
            uri = new URI(baseUrl.strip());
        } catch (java.net.URISyntaxException ex) {
            throw new IllegalArgumentException("base URL con formato inválido");
        }
        String host = uri.getHost();
        if (host == null || uri.getRawUserInfo() != null) {
            throw new IllegalArgumentException("base URL sin host o con credenciales");
        }
        boolean https = "https".equalsIgnoreCase(uri.getScheme());
        boolean plano = "http".equalsIgnoreCase(uri.getScheme());
        String h = host.toLowerCase(Locale.ROOT);
        boolean local = h.equals("localhost") || h.equals("127.0.0.1") || h.equals("[::1]") || h.equals("::1");
        if (!https && !(plano && local)) {
            throw new IllegalArgumentException("la base URL debe ser https (http solo para localhost)");
        }
        String base = uri.toString();
        while (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return URI.create(base + "/audio/transcriptions");
    }

    @Override
    public boolean habilitado() {
        return !apiKey.isEmpty() && endpoint != null;
    }

    @Override
    public ResultadoVoz transcribir(AudioVoz audio) {
        if (!habilitado()) throw new TranscripcionException("Transcripción deshabilitada");
        if (audio == null || audio.bytes() == null || audio.bytes().length == 0) {
            throw new TranscripcionException("Audio vacío");
        }
        String ext = EXTENSIONES.getOrDefault(audio.mime() == null ? "" : audio.mime(), "ogg");
        ByteArrayResource archivo = new ByteArrayResource(audio.bytes()) {
            @Override
            public String getFilename() {
                return "audio." + ext;
            }
        };
        MultiValueMap<String, Object> cuerpo = new LinkedMultiValueMap<>();
        cuerpo.add("file", archivo);
        cuerpo.add("model", modelo);
        cuerpo.add("response_format", "verbose_json");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(apiKey);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        String respuesta;
        try {
            var r = http.postForEntity(endpoint, new HttpEntity<>(cuerpo, headers), String.class);
            if (!r.getStatusCode().is2xxSuccessful()) {
                throw new TranscripcionException("El proveedor respondió HTTP " + r.getStatusCode().value());
            }
            respuesta = r.getBody();
        } catch (RestClientException ex) {
            // Sin el mensaje de la excepción original: puede traer la URL o el cuerpo de la respuesta.
            throw new TranscripcionException("No se pudo contactar al proveedor de transcripción ("
                + ex.getClass().getSimpleName() + ")");
        }
        return interpretar(respuesta);
    }

    private ResultadoVoz interpretar(String respuesta) {
        JsonNode raiz;
        try {
            raiz = json.readTree(respuesta == null ? "" : respuesta);
        } catch (java.io.IOException ex) {
            throw new TranscripcionException("Respuesta del proveedor no es JSON válido");
        }
        if (raiz == null || !raiz.hasNonNull("text") || !raiz.get("text").isTextual()) {
            throw new TranscripcionException("Respuesta del proveedor sin texto");
        }
        JsonNode dur = raiz.get("duration");
        if (dur == null || !dur.isNumber() || dur.asDouble() < 0) {
            throw new TranscripcionException("Respuesta del proveedor sin duración");
        }
        int segundos = (int) Math.ceil(dur.asDouble());
        if (segundos > config.maxSegundos()) {
            throw new TranscripcionException("Nota de voz más larga que el máximo permitido");
        }
        String texto = raiz.get("text").asText().strip();
        if (texto.isEmpty()) throw new TranscripcionException("No se entendió el audio");
        return new ResultadoVoz(texto, segundos);
    }

    /** Sin redirecciones, sin reintentos, sin cookies; timeout de {@link VozConfig}; no lanza por códigos HTTP. */
    static RestTemplate nuevoCliente(VozConfig config) {
        long ms = Duration.ofSeconds(config.timeoutSegundos()).toMillis();
        var conexion = ConnectionConfig.custom()
            .setConnectTimeout(Timeout.ofMilliseconds(Math.min(ms, 5_000)))
            .setSocketTimeout(Timeout.ofMilliseconds(ms))
            .build();
        var pedido = RequestConfig.custom()
            .setResponseTimeout(Timeout.ofMilliseconds(ms))
            .setRedirectsEnabled(false)
            .build();
        var cliente = HttpClients.custom()
            .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
                .setDefaultConnectionConfig(conexion).build())
            .setDefaultRequestConfig(pedido)
            .disableRedirectHandling()
            .disableCookieManagement()
            .disableAutomaticRetries()
            .build();
        RestTemplate rt = new RestTemplate(new HttpComponentsClientHttpRequestFactory(cliente));
        rt.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) {
                return false;
            }

            @Override
            public void handleError(URI url, HttpMethod method, ClientHttpResponse response) {
                // nunca se invoca
            }
        });
        return rt;
    }
}
