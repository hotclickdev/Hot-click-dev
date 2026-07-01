package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Verifica dos fuentes de riesgo en cada login exitoso:
 *
 *  1. ip-api.com  — geolocalización: detecta ISP/org de centros penitenciarios.
 *  2. AbuseIPDB   — reputación: score 0-100 basado en reportes de la comunidad.
 *
 * Ambas llamadas corren en paralelo dentro de un Virtual Thread para no
 * bloquear el hilo del login. Resultados se cachean en memoria por IP.
 */
@Service
public class GeoIpService {

    private static final Logger log = LoggerFactory.getLogger(GeoIpService.class);

    private final SecurityDetectionService detectionService;
    private final SecurityAuditService     auditService;
    private final ObjectMapper             objectMapper;

    @Value("${abuseipdb.api.key:}")
    private String abuseIpDbKey;

    public GeoIpService(SecurityDetectionService detectionService,
                        SecurityAuditService auditService,
                        ObjectMapper objectMapper) {
        this.detectionService = detectionService;
        this.auditService     = auditService;
        this.objectMapper     = objectMapper;
    }

    // Cache: IP → es de riesgo (true = ya generó alerta, false = limpia)
    private final ConcurrentHashMap<String, Boolean> prisonCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> abuseCache  = new ConcurrentHashMap<>();

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    // Keywords en ISP/org que indican centros de privación de libertad
    private static final List<String> PRISON_KEYWORDS = List.of(
        // Español
        "cárcel", "carcel", "penitenciar", "prisión", "prision",
        "privado de libertad", "centro de detención", "centro de detencion",
        "sistema penitenciario", "reclusorio", "correccional",
        "ministerio de justicia y paz",
        // English
        "prison", "jail", "correctional", "detention center",
        "department of corrections", "bureau of prisons",
        "state prison", "federal prison", "county jail",
        "correction facility", "penitentiary"
    );

    // Score de AbuseIPDB a partir del cual se genera alerta
    private static final int ABUSE_SCORE_HIGH     = 50;  // → alerta HIGH
    private static final int ABUSE_SCORE_CRITICAL = 75;  // → alerta CRITICAL

    // IPs privadas/locales que se omiten
    private static final Set<String> PRIVATE_PREFIXES = Set.of(
        "127.", "10.", "192.168.", "::1", "0:0:0:0:0:0:0:1",
        "172.16.", "172.17.", "172.18.", "172.19.", "172.20.",
        "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
        "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."
    );

    /** Lanza ambas verificaciones en paralelo. No bloquea el hilo del login. */
    public void checkAsync(String ip, Long userId, String email) {
        if (ip == null || isPrivate(ip)) return;
        Thread.ofVirtual().start(() -> {
            CompletableFuture<Void> geo   = CompletableFuture.runAsync(() -> checkGeoIp(ip, userId, email));
            CompletableFuture<Void> abuse = CompletableFuture.runAsync(() -> checkAbuseIpDb(ip, userId, email));
            CompletableFuture.allOf(geo, abuse).join();
        });
    }

    // ── Check 1: ip-api.com — geolocalización / prisión ──────────────────────

    private void checkGeoIp(String ip, Long userId, String email) {
        if (Boolean.FALSE.equals(prisonCache.get(ip))) return;

        try {
            String url = "http://ip-api.com/json/" + ip
                + "?fields=status,country,regionName,city,isp,org";

            HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder().uri(URI.create(url))
                    .timeout(Duration.ofSeconds(7)).GET().build(),
                HttpResponse.BodyHandlers.ofString()
            );
            if (resp.statusCode() != 200) return;

            JsonNode node = objectMapper.readTree(resp.body());
            if (!"success".equalsIgnoreCase(node.path("status").asText())) return;

            String isp    = node.path("isp").asText("").toLowerCase();
            String org    = node.path("org").asText("").toLowerCase();
            String city   = node.path("city").asText("");
            String region = node.path("regionName").asText("");
            String country= node.path("country").asText("");

            boolean isPrison = PRISON_KEYWORDS.stream()
                .anyMatch(k -> isp.contains(k) || org.contains(k));

            prisonCache.put(ip, isPrison);
            if (!isPrison) return;

            String location = city + ", " + region + ", " + country;
            String message  = "Acceso desde posible centro penitenciario — IP " + ip;
            String details  = "Ubicación: " + location
                + " | ISP: " + node.path("isp").asText()
                + " | Org: " + node.path("org").asText()
                + (email != null ? " | Usuario: " + email : "");

            detectionService.generateAlert("PRISON_IP_DETECTED",
                SecurityEventSeverity.CRITICAL, ip, userId, message, details);
            auditService.logDetection(SecurityEventType.PRISON_IP_DETECTED,
                SecurityEventSeverity.CRITICAL, ip, userId, details);

            log.warn("[GEOIP] Prison IP ip={} isp={} org={} location={} userId={} email={}",
                ip, isp, org, location, userId, email);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.debug("[GEOIP] ip-api check failed for {}: {}", ip, e.getMessage());
        }
    }

    // ── Check 2: AbuseIPDB — reputación de la IP ─────────────────────────────

    private void checkAbuseIpDb(String ip, Long userId, String email) {
        if (abuseIpDbKey == null || abuseIpDbKey.isBlank()) return;

        // Si el score ya está cacheado y es bajo, no repetir
        Integer cached = abuseCache.get(ip);
        if (cached != null && cached < ABUSE_SCORE_HIGH) return;

        try {
            String url = "https://api.abuseipdb.com/api/v2/check"
                + "?ipAddress=" + ip + "&maxAgeInDays=90";

            HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder().uri(URI.create(url))
                    .header("Key", abuseIpDbKey)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(7)).GET().build(),
                HttpResponse.BodyHandlers.ofString()
            );
            if (resp.statusCode() != 200) {
                log.debug("[ABUSEIPDB] HTTP {} for {}", resp.statusCode(), ip);
                return;
            }

            JsonNode data   = objectMapper.readTree(resp.body()).path("data");
            int score       = data.path("abuseConfidenceScore").asInt(0);
            int totalReports= data.path("totalReports").asInt(0);
            String isp      = data.path("isp").asText("—");
            String usageType= data.path("usageType").asText("—");
            String country  = data.path("countryCode").asText("—");

            abuseCache.put(ip, score);

            if (score < ABUSE_SCORE_HIGH) return;

            SecurityEventSeverity sev = score >= ABUSE_SCORE_CRITICAL
                ? SecurityEventSeverity.CRITICAL
                : SecurityEventSeverity.HIGH;

            String message = "IP con reputación abusiva detectada — score " + score + "/100 — IP " + ip;
            String details = "Score: " + score + "/100"
                + " | Reportes totales: " + totalReports
                + " | ISP: " + isp
                + " | Tipo de uso: " + usageType
                + " | País: " + country
                + (email != null ? " | Usuario: " + email : "");

            detectionService.generateAlert("ABUSIVE_IP_DETECTED",
                sev, ip, userId, message, details);
            auditService.logDetection(SecurityEventType.ABUSIVE_IP_DETECTED,
                sev, ip, userId, details);

            log.warn("[ABUSEIPDB] Abusive IP ip={} score={} isp={} userId={} email={}",
                ip, score, isp, userId, email);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.debug("[ABUSEIPDB] Check failed for {}: {}", ip, e.getMessage());
        }
    }

    private boolean isPrivate(String ip) {
        return PRIVATE_PREFIXES.stream().anyMatch(ip::startsWith);
    }
}
