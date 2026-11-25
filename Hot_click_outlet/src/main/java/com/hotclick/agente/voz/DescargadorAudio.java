package com.hotclick.agente.voz;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.voz.AudioRechazadoException.Motivo;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

/**
 * Descarga segura de notas de voz (AG-13). WhatsApp: Graph da la URL temporal a partir del id de media y se baja con
 * el token de la cuenta del canal. Instagram y Messenger: el webhook trae la URL, que solo se acepta si es https de
 * un dominio de Meta (lista blanca, contra SSRF); a esas URLs nunca se les manda el token. Sin redirecciones, con
 * timeout, tope de tamaño (también al leer el flujo) y tipos MIME permitidos. El audio vive solo en memoria; nada se
 * registra del contenido, de la URL ni del remitente.
 */
@Component
public class DescargadorAudio {

    /** Dominios de Meta desde los que se acepta un adjunto (el dominio exacto o cualquier subdominio). */
    static final Set<String> DOMINIOS_META = Set.of("fbcdn.net", "fbsbx.com", "cdninstagram.com");

    private final MetaGraphCliente graph;
    private final CanalCuentaService cuentas;
    private final VozConfig config;
    private final RestTemplate http;

    @Autowired
    public DescargadorAudio(MetaGraphCliente graph, CanalCuentaService cuentas, VozConfig config) {
        this(graph, cuentas, config, nuevoCliente(config));
    }

    DescargadorAudio(MetaGraphCliente graph, CanalCuentaService cuentas, VozConfig config, RestTemplate http) {
        this.graph = graph;
        this.cuentas = cuentas;
        this.config = config;
        this.http = http;
    }

    /** @throws AudioRechazadoException por regla de seguridad o límite; otras excepciones vienen de Graph (timeout, 4xx). */
    public AudioVoz descargar(CanalCuenta cuenta, MensajeEntrante mensaje) {
        String ref = mensaje.mediaId();
        if (ref == null || ref.isBlank()) throw new AudioRechazadoException(Motivo.SIN_MEDIA);
        return mensaje.canal() == MensajeEntrante.Canal.WHATSAPP
            ? deWhatsapp(cuenta, ref)
            : deRedSocial(ref);
    }

    private AudioVoz deWhatsapp(CanalCuenta cuenta, String mediaId) {
        String token = cuentas.tokenDe(cuenta);
        if (token == null || token.isBlank()) throw new AudioRechazadoException(Motivo.SIN_TOKEN);
        MetaGraphCliente.MediaWhatsapp media = graph.mediaWhatsapp(mediaId, token);
        if (media.tamano() > config.maxBytes()) throw new AudioRechazadoException(Motivo.DEMASIADO_GRANDE);
        String mime = normalizarMime(media.mime());
        if (!mimePermitido(mime)) throw new AudioRechazadoException(Motivo.TIPO_NO_PERMITIDO);
        URI uri = validarUrl(media.url());
        Bajada b = bajar(uri, token);
        return new AudioVoz(b.bytes(), mime);
    }

    private AudioVoz deRedSocial(String url) {
        URI uri = validarUrl(url);
        Bajada b = bajar(uri, null);
        String mime = normalizarMime(b.contentType());
        if (!mimePermitido(mime)) throw new AudioRechazadoException(Motivo.TIPO_NO_PERMITIDO);
        return new AudioVoz(b.bytes(), mime);
    }

    /** https, sin credenciales en la URL, puerto 443 y host dentro de la lista blanca de Meta. */
    static URI validarUrl(String url) {
        URI uri;
        try {
            uri = new URI(url == null ? "" : url.strip());
        } catch (java.net.URISyntaxException e) {
            throw new AudioRechazadoException(Motivo.URL_NO_PERMITIDA);
        }
        String host = uri.getHost();
        boolean ok = "https".equalsIgnoreCase(uri.getScheme())
            && host != null
            && uri.getRawUserInfo() == null
            && (uri.getPort() == -1 || uri.getPort() == 443)
            && dominioPermitido(host.toLowerCase(Locale.ROOT));
        if (!ok) throw new AudioRechazadoException(Motivo.URL_NO_PERMITIDA);
        return uri;
    }

    static boolean dominioPermitido(String host) {
        for (String d : DOMINIOS_META) {
            if (host.equals(d) || host.endsWith("." + d)) return true;
        }
        return false;
    }

    static String normalizarMime(String mime) {
        if (mime == null) return "";
        int i = mime.indexOf(';');
        return (i >= 0 ? mime.substring(0, i) : mime).strip().toLowerCase(Locale.ROOT);
    }

    static boolean mimePermitido(String mime) {
        return VozConfig.MIME_PERMITIDOS.contains(mime);
    }

    private record Bajada(byte[] bytes, String contentType) { }

    private Bajada bajar(URI uri, String bearer) {
        long max = config.maxBytes();
        try {
            return http.execute(uri, HttpMethod.GET,
                req -> {
                    if (bearer != null) req.getHeaders().setBearerAuth(bearer);
                },
                resp -> {
                    int status = resp.getStatusCode().value();
                    if (status < 200 || status >= 300) throw new AudioRechazadoException(Motivo.DESCARGA_FALLIDA);
                    long declarado = resp.getHeaders().getContentLength();
                    if (declarado > max) throw new AudioRechazadoException(Motivo.DEMASIADO_GRANDE);
                    String tipo = resp.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE);
                    try (InputStream in = resp.getBody()) {
                        return new Bajada(leerAcotado(in, max), tipo);
                    }
                });
        } catch (RestClientException e) {
            // Sin mensaje de la excepción: trae la URL.
            throw new AudioRechazadoException(Motivo.DESCARGA_FALLIDA);
        }
    }

    private static byte[] leerAcotado(InputStream in, long max) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        long total = 0;
        int n;
        while ((n = in.read(buf)) != -1) {
            total += n;
            if (total > max) throw new AudioRechazadoException(Motivo.DEMASIADO_GRANDE);
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    private static RestTemplate nuevoCliente(VozConfig config) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);
                // Una redirección podría llevar fuera de la lista blanca (SSRF) y arrastrar el token.
                connection.setInstanceFollowRedirects(false);
            }
        };
        int ms = (int) Duration.ofSeconds(config.timeoutSegundos()).toMillis();
        f.setConnectTimeout(Math.min(ms, 5_000));
        f.setReadTimeout(ms);
        return new RestTemplate(f);
    }
}
