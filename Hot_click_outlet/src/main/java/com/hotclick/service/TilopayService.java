package com.hotclick.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Cliente Tilopay API v1: login API (24h), loginSdk (1h) y consulta de transacción.
 * Sin credenciales, el modo simulado solo existe en perfiles dev y test.
 * En cualquier otro perfil los pagos con tarjeta quedan deshabilitados.
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

    @Autowired
    private Environment environment;

    private RestClient restClient;
    private boolean mockMode;
    private boolean pagosDisponibles;

    private final AtomicReference<CachedToken> apiToken = new AtomicReference<>();
    private final AtomicReference<CachedToken> sdkToken = new AtomicReference<>();

    /**
     * Resultado de POST /api/v1/consult. El monto y la moneda son los que Tilopay cobró.
     * {@code simulada} solo es true en el modo de desarrollo, nunca con una respuesta real.
     */
    public record ConsultaResultado(
            boolean aprobada,
            String code,
            String description,
            String auth,
            BigDecimal amount,
            String currency,
            String orderNumber,
            boolean simulada) {

        public ConsultaResultado(boolean aprobada, String code, String description, String auth) {
            this(aprobada, code, description, auth, null, null, null, false);
        }

        public static ConsultaResultado simulada(boolean aprobada, String orderNumber) {
            return new ConsultaResultado(
                    aprobada,
                    aprobada ? "1" : "0",
                    aprobada ? "Mock approved" : "Mock declined",
                    aprobada ? "MOCK-AUTH" : null,
                    null,
                    "CRC",
                    orderNumber,
                    true);
        }
    }

    private record CachedToken(String token, Instant expiresAt) {
        boolean vigente() {
            return token != null && expiresAt != null && Instant.now().isBefore(expiresAt.minusSeconds(60));
        }
    }

    @PostConstruct
    void init() {
        boolean credenciales = credencialesPresentes();
        mockMode = !credenciales && perfilDeSimulacion();
        pagosDisponibles = credenciales || mockMode;
        restClient = RestClient.builder().baseUrl(baseUrl).build();
        if (mockMode) {
            log.warn("[tilopay] Sin credenciales en perfil dev/test — modo simulado. No cobra tarjetas reales.");
            return;
        }
        if (!credenciales) {
            log.error("[ALERTA-PAGO] Tilopay sin credenciales fuera de dev/test. Pagos con tarjeta deshabilitados.");
            return;
        }
        log.info("[tilopay] Cliente inicializado baseUrl={}", baseUrl);
    }

    public boolean isPagosDisponibles() {
        return pagosDisponibles;
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
        exigirDisponible();
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
        exigirDisponible();
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
     * Consulta el estado real. En simulación (solo dev/test): aprobada salvo orderNumber con "-FAIL".
     * Sin credenciales fuera de dev/test no aprueba.
     */
    @CircuitBreaker(name = "tilopay", fallbackMethod = "consultarFallback")
    @Retry(name = "tilopay")
    public ConsultaResultado consultarTransaccion(String orderNumber) {
        if (blank(orderNumber)) {
            return new ConsultaResultado(false, "0", "orderNumber vacío", null);
        }
        if (!pagosDisponibles) {
            return new ConsultaResultado(false, "0", "Pagos con tarjeta no están disponibles", null);
        }
        if (mockMode) {
            boolean ok = !orderNumber.toUpperCase().contains("-FAIL");
            return ConsultaResultado.simulada(ok, orderNumber);
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
        return new ConsultaResultado(
                "1".equals(code),
                code,
                desc,
                auth,
                leerMonto(primero(tx, "amount", "Amount")),
                leerTexto(primero(tx, "currency", "Currency")),
                leerTexto(primero(tx, "orderNumber", "order")),
                false);
    }

    static BigDecimal leerMonto(Object raw) {
        if (raw == null) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(raw).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Object primero(Map<String, Object> tx, String a, String b) {
        Object valor = tx.get(a);
        return valor != null ? valor : tx.get(b);
    }

    private static String leerTexto(Object raw) {
        if (raw == null) {
            return null;
        }
        String texto = String.valueOf(raw).trim();
        return texto.isEmpty() ? null : texto;
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

    private void exigirDisponible() {
        if (!pagosDisponibles) {
            throw new IllegalStateException("Pagos con tarjeta no están disponibles");
        }
    }

    private boolean credencialesPresentes() {
        return !blank(apiUser) && !blank(password) && !blank(apiKey);
    }

    private boolean perfilDeSimulacion() {
        return environment != null && environment.acceptsProfiles(Profiles.of("dev", "test"));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
