package com.hotclick.seo.indexnow;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Avisa a IndexNow (Bing, Yandex, etc.) cuando una URL canónica se publica, cambia o se borra.
 * <p>
 * Sin clave configurada es un no-op silencioso (no abre ninguna conexión). La clave nunca va en el repo:
 * {@code INDEXNOW_KEY} (env) o {@code INDEXNOW_KEY_FILE} (ruta a un archivo fuera de git con la clave).
 * El archivo {@code /{clave}.txt} lo sirve {@link IndexNowKeyFilter} solo si hay clave.
 */
@Service
public class IndexNowService {

    private static final Logger log = LoggerFactory.getLogger(IndexNowService.class);
    /** Formato que exige el protocolo: 8 a 128 caracteres, letras, números o guion. */
    private static final Pattern CLAVE_VALIDA = Pattern.compile("[A-Za-z0-9-]{8,128}");

    private final String claveDirecta;
    private final String archivoClave;
    private final String endpoint;
    private final String appUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public IndexNowService(@Value("${indexnow.key:}") String claveDirecta,
                           @Value("${indexnow.key-file:}") String archivoClave,
                           @Value("${indexnow.endpoint:https://api.indexnow.org/indexnow}") String endpoint,
                           @Value("${app.url:https://hotclick.lat}") String appUrl) {
        this.claveDirecta = claveDirecta;
        this.archivoClave = archivoClave;
        this.endpoint = endpoint;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    /** Clave vigente y válida, o vacío si IndexNow no está configurado. */
    public java.util.Optional<String> clave() {
        String k = claveDirecta == null ? "" : claveDirecta.trim();
        if (k.isEmpty() && archivoClave != null && !archivoClave.isBlank()) {
            try {
                k = Files.readString(Path.of(archivoClave.trim()), StandardCharsets.UTF_8).trim();
            } catch (IOException | RuntimeException e) {
                log.warn("[indexnow] No se pudo leer indexnow.key-file; IndexNow queda apagado");
                return java.util.Optional.empty();
            }
        }
        return CLAVE_VALIDA.matcher(k).matches() ? java.util.Optional.of(k) : java.util.Optional.empty();
    }

    public boolean activo() {
        return clave().isPresent();
    }

    /** Ruta canónica (ej. {@code /productos/12}). Si hay transacción abierta espera al commit. */
    public void notificarRuta(String path) {
        if (path == null || path.isBlank() || !activo()) return;
        String ruta = path.startsWith("/") ? path : "/" + path;
        Runnable envio = () -> Thread.ofVirtual().name("indexnow").start(() -> enviar(List.of(appUrl + ruta)));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { envio.run(); }
            });
        } else {
            envio.run();
        }
    }

    public void notificarProducto(Long id) {
        if (id != null) notificarRuta("/productos/" + id);
    }

    public void notificarTienda(String slug) {
        if (slug != null && !slug.isBlank()) notificarRuta("/tienda/" + slug);
    }

    public void notificarArticulo(String slug) {
        if (slug != null && !slug.isBlank()) notificarRuta("/blog/" + slug);
    }

    /** Envío síncrono de las URLs; {@link #notificarRuta} lo corre en un hilo aparte. Nunca lanza. */
    public void enviar(List<String> urls) {
        String clave = clave().orElse(null);
        if (clave == null || urls == null || urls.isEmpty()) return;
        try {
            String host = URI.create(appUrl).getHost();
            StringBuilder lista = new StringBuilder();
            for (String u : urls) {
                if (lista.length() > 0) lista.append(',');
                lista.append('"').append(u.replace("\\", "\\\\").replace("\"", "\\\"")).append('"');
            }
            String body = "{\"host\":\"" + host + "\",\"key\":\"" + clave + "\",\"keyLocation\":\""
                + appUrl + "/" + clave + ".txt\",\"urlList\":[" + lista + "]}";
            HttpRequest req = HttpRequest.newBuilder(URI.create(endpoint))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<Void> res = http.send(req, HttpResponse.BodyHandlers.discarding());
            if (res.statusCode() >= 300) {
                log.warn("[indexnow] Respuesta {} al avisar {} URL(s)", res.statusCode(), urls.size());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("[indexnow] No se pudo avisar: {}", e.getClass().getSimpleName());
        }
    }
}
