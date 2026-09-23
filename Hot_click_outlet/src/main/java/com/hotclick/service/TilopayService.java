package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Cliente Tilopay API v1: login API (24h), loginSdk (1h) y consulta de transacción.
 * Sin credenciales → modo mock (desarrollo sin afiliación).
 */
@Service
public class TilopayService {

    private static final Logger log = LoggerFactory.getLogger(TilopayService.class);

    @Value("${tilopay.api-user:}")
    private String apiUser;

    @Value("${tilopay.password:}")
    private String password;

    @Value("${tilopay.key:}")
    private String apiKey;

    @Value("${tilopay.base-url:https://app.tilopay.com}")
    private String baseUrl;

    private RestClient restClient;
    private boolean mockMode;

    private final AtomicReference<CachedToken> apiToken = new AtomicReference<>();
    private final AtomicReference<CachedToken> sdkToken = new AtomicReference<>();

    public record ConsultaResultado(boolean aprobada, String code, String description, String auth) {}

    private record CachedToken(String token, Instant expiresAt) {
        boolean vigente() {
            return token != null && expiresAt != null && Instant.now().isBefore(expiresAt.minusSeconds(60));
        }
    }

    @PostConstruct
    void init() {
        mockMode = blank(apiUser) || blank(password) || blank(apiKey);
        restClient = RestClient.builder().baseUrl(baseUrl).build();
        if (mockMode) {
            log.warn("[tilopay] Credenciales incompletas — modo MOCK activo. "
                + "Configurá TILOPAY_API_USER, TILOPAY_PASSWORD y TILOPAY_KEY.");
            return;
        }
        log.info("[tilopay] Cliente inicializado baseUrl={}", baseUrl);
    }

    public boolean isMockMode() {
        return mockMode;
    }

    public String getApiKey() {
        return apiKey != null ? apiKey : "";
    }

    @CircuitBreaker(name = "tilopay", fallbackMethod = "loginSdkFallback")
    @Retry(name = "tilopay")
    public String loginSdk() {
        if (mockMode) {
            return "mock-sdk-token";
        }
        CachedToken cached = sdkToken.get();
        if (cached != null && cached.vigente()) {
            return cached.token();
        }
        return pedirToken("/api/v1/loginSdk", sdkToken, 3600);
    }

    @SuppressWarnings("unused")
    private String loginSdkFallback(Throwable t) {
        log.error("[tilopay] loginSdk falló: {}", t.getMessage());
        throw new IllegalStateException("Tilopay no disponible (loginSdk)", t);
    }

    @CircuitBreaker(name = "tilopay", fallbackMethod = "loginApiFallback")
    @Retry(name = "tilopay")
    public String loginApi() {
        if (mockMode) {
            return "mock-api-token";
        }
        CachedToken cached = apiToken.get();
        if (cached != null && cached.vigente()) {
            return cached.token();
        }
        return pedirToken("/api/v1/login", apiToken, 86400);
    }

    @SuppressWarnings("unused")
    private String loginApiFallback(Throwable t) {
        log.error("[tilopay] login API falló: {}", t.getMessage());
        throw new IllegalStateException("Tilopay no disponible (login)", t);
    }

    /**
     * Consulta el estado real de la transacción. En mock: aprobada salvo orderNumber con "-FAIL".
     */
    @CircuitBreaker(name = "tilopay", fallbackMethod = "consultarFallback")
    @Retry(name = "tilopay")
    public ConsultaResultado consultarTransaccion(String orderNumber) {
        if (blank(orderNumber)) {
            return new ConsultaResultado(false, "0", "orderNumber vacío", null);
        }
        if (mockMode) {
            boolean ok = !orderNumber.toUpperCase().contains("-FAIL");
            return new ConsultaResultado(ok, ok ? "1" : "0",
                ok ? "Mock approved" : "Mock declined", ok ? "MOCK-AUTH" : null);
        }

        String token = loginApi();
        @SuppressWarnings("unchecked")
        Map<String, Object> body = restClient.post()
            .uri("/api/v1/consult")
            .contentType(MediaType.APPLICATION_JSON)
            .header("Authorization", "bearer " + token)
            .body(Map.of("key", apiKey, "orderNumber", orderNumber, "merchantId", ""))
            .retrieve()
            .body(Map.class);

        return parseConsulta(body);
    }

    @SuppressWarnings("unchecked")
    static ConsultaResultado parseConsulta(Map<String, Object> body) {
        if (body == null) {
            return new ConsultaResultado(false, "0", "Respuesta vacía", null);
        }
        Map<String, Object> tx = primeraTransaccion(body.get("response"));
        if (tx == null) {
            tx = body;
        }
        String code = String.valueOf(tx.getOrDefault("code", tx.getOrDefault("Code", "0")));
        String desc = String.valueOf(tx.getOrDefault("response",
            tx.getOrDefault("description", tx.getOrDefault("codeDescription", ""))));
        String auth = tx.get("auth") != null ? String.valueOf(tx.get("auth")) : null;
        return new ConsultaResultado("1".equals(code), code, desc, auth);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> primeraTransaccion(Object response) {
        if (response instanceof java.util.List<?> list && !list.isEmpty()
            && list.get(0) instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        if (response instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return null;
    }

    @SuppressWarnings("unused")
    private ConsultaResultado consultarFallback(String orderNumber, Throwable t) {
        log.error("[tilopay] consult falló order={}: {}", orderNumber, t.getMessage());
        return new ConsultaResultado(false, "0", "Tilopay no disponible: " + t.getMessage(), null);
    }

    @SuppressWarnings("unchecked")
    private String pedirToken(String path, AtomicReference<CachedToken> cache, int defaultTtlSec) {
        Map<String, Object> body = restClient.post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("apiuser", apiUser, "password", password))
            .retrieve()
            .body(Map.class);
        if (body == null || body.get("access_token") == null) {
            throw new IllegalStateException("Tilopay login sin access_token: " + path);
        }
        String token = String.valueOf(body.get("access_token"));
        int ttl = defaultTtlSec;
        Object expires = body.get("expires_in");
        if (expires instanceof Number n) {
            ttl = n.intValue();
        }
        cache.set(new CachedToken(token, Instant.now().plusSeconds(ttl)));
        return token;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
