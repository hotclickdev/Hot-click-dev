package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Plugin;
import com.hotclick.model.PluginEvento;
import com.hotclick.repository.PluginEventoRepository;
import com.hotclick.repository.PluginRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Dispatches HOTCLICK events to registered webhook plugins.
 *
 * Called with @Async so the dispatch never blocks the main request thread.
 * Each dispatch is logged to plugin_evento_tb with its HTTP response code.
 *
 * Signature header: X-HOTCLICK-Signature: sha256=<hex-hmac>
 */
@Service
public class WebhookDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcherService.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    private static final HttpClient HTTP   = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    @Autowired private PluginRepository       pluginRepository;
    @Autowired private PluginEventoRepository pluginEventoRepository;
    @Autowired private ObjectMapper           objectMapper;

    /**
     * Fires all active WEBHOOK plugins of the given empresa that are subscribed to {@code evento}.
     * Each call is async and non-blocking from the caller's perspective.
     */
    @Async
    @Transactional
    public void dispatch(Long empresaId, String evento, Map<String, Object> data) {
        if (empresaId == null) return;

        List<Plugin> plugins = pluginRepository.findByEmpresaIdAndActivoTrueOrderByNombreAsc(empresaId);
        for (Plugin plugin : plugins) {
            if (!"WEBHOOK".equals(plugin.getTipo())) continue;
            if (!isSubscribed(plugin.getEventosSuscritos(), evento)) continue;

            send(plugin, evento, data);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    // ── SSRF protection ───────────────────────────────────────────────────────

    private static final Set<String> BLOCKED_HOSTS = Set.of(
        "localhost", "127.0.0.1", "0.0.0.0", "::1"
    );

    /**
     * Validates that the URL is safe to call as an outbound webhook.
     * Throws IllegalArgumentException if the URL targets internal infrastructure.
     */
    public static void validateWebhookUrl(String url) {
        if (url == null || url.isBlank()) throw new IllegalArgumentException("URL requerida");
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("URL inválida: " + e.getMessage());
        }
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("Solo se permiten URLs http/https");
        }
        String host = uri.getHost();
        if (host == null) throw new IllegalArgumentException("URL sin host");
        if (BLOCKED_HOSTS.contains(host.toLowerCase())) {
            throw new IllegalArgumentException("URL apunta a host restringido: " + host);
        }
        // Reject private/loopback IPs by resolving the hostname
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isLoopbackAddress() || addr.isSiteLocalAddress()
                    || addr.isLinkLocalAddress() || addr.isAnyLocalAddress()) {
                throw new IllegalArgumentException("URL apunta a red privada: " + host);
            }
            // Block cloud metadata endpoint (169.254.x.x)
            byte[] bytes = addr.getAddress();
            if (bytes.length == 4 && (bytes[0] & 0xFF) == 169 && (bytes[1] & 0xFF) == 254) {
                throw new IllegalArgumentException("URL apunta a dirección de metadata de cloud");
            }
        } catch (IllegalArgumentException rethrow) {
            throw rethrow;
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo resolver el host: " + host);
        }
        // Reject common internal ports
        int port = uri.getPort();
        if (port > 0 && Set.of(22, 3306, 5432, 6379, 8500, 9200, 27017).contains(port)) {
            throw new IllegalArgumentException("Puerto interno restringido: " + port);
        }
    }

    private void send(Plugin plugin, String evento, Map<String, Object> data) {
        PluginEvento log_entry = new PluginEvento();
        log_entry.setPlugin(plugin);
        log_entry.setEvento(evento);

        try {
            validateWebhookUrl(plugin.getUrl());

            Map<String, Object> body = Map.of(
                "evento",     evento,
                "empresa_id", plugin.getEmpresa().getId(),
                "timestamp",  System.currentTimeMillis() / 1000,
                "data",       data
            );
            String json = objectMapper.writeValueAsString(body);
            // Solo guardar metadatos en el log — nunca PII del cliente
            log_entry.setPayload(objectMapper.writeValueAsString(Map.of(
                "evento",     evento,
                "empresa_id", plugin.getEmpresa().getId(),
                "timestamp",  body.get("timestamp")
            )));

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(plugin.getUrl()))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .header("User-Agent", "HOTCLICK-Webhooks/1.0")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));

            if (plugin.getSecretoHmac() != null && !plugin.getSecretoHmac().isBlank()) {
                reqBuilder.header("X-HOTCLICK-Signature", "sha256=" + hmac(json, plugin.getSecretoHmac()));
            }

            HttpResponse<String> response = HTTP.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            log_entry.setCodigoRespuesta(response.statusCode());
            log_entry.setEstado(response.statusCode() >= 200 && response.statusCode() < 300 ? "ENVIADO" : "FALLIDO");

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            marcarWebhookFallido(log_entry, plugin, evento, e);
        } catch (Exception e) {
            marcarWebhookFallido(log_entry, plugin, evento, e);
        }

        pluginEventoRepository.save(log_entry);
    }

    private void marcarWebhookFallido(PluginEvento logEntry, Plugin plugin, String evento, Exception e) {
        logEntry.setEstado("FALLIDO");
        String msg = e.getMessage() != null ? e.getMessage() : "Error desconocido";
        logEntry.setMensajeError(msg.substring(0, Math.min(msg.length(), 490)));
        log.warn("Webhook fallo plugin={} evento={}: {}", plugin.getId(), evento, e.getMessage());
    }

    private boolean isSubscribed(String eventosSuscritos, String evento) {
        if (eventosSuscritos == null || eventosSuscritos.isBlank() || "[]".equals(eventosSuscritos.trim())) return false;
        return eventosSuscritos.contains("\"" + evento + "\"") || eventosSuscritos.contains("\"*\"");
    }

    private String hmac(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
