package com.hotclick.service.payment;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Tokens HMAC de invitado para cancelar o reintentar un pedido sin exponer la acción
 * a quien solo conozca el número de pedido.
 *
 * <p>v2: {@code v2.<expEpochSeg>.<hex>} con HMAC-SHA256(clave dedicada, "v2|proposito|pedido|exp"),
 * vence a las 24 h y queda atado a un propósito. v1 (HMAC(jwt.secret, pedido), sin propósito
 * ni vencimiento) solo se acepta hasta {@code app.guest-token.v1-aceptar-hasta}.
 */
@Service
public class GuestCancelTokenService {

    private static final Logger log = LoggerFactory.getLogger(GuestCancelTokenService.class);
    private static final String ALG = "HmacSHA256";
    private static final String PREFIJO_V2 = "v2.";
    static final Duration VIGENCIA = Duration.ofHours(24);
    /** Tolerancia de reloj para el tope superior de exp. */
    static final Duration SKEW = Duration.ofMinutes(5);

    public enum Proposito { CANCELAR, REINTENTAR }

    /** Clave v1 (legado): solo para validar tokens viejos durante la ventana de compatibilidad. */
    @Value("${jwt.secret}")
    private String secret;

    /** Clave dedicada v2 (GUEST_TOKEN_SECRET). Obligatoria en prod. */
    @Value("${app.guest-token.secret:}")
    private String claveV2;

    /** Instante ISO-8601 hasta el que se aceptan tokens v1. Vacío = v1 rechazado. */
    @Value("${app.guest-token.v1-aceptar-hasta:}")
    private String v1AceptarHasta;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired(required = false)
    private Environment environment;

    private Clock clock = Clock.systemUTC();

    /** Misma regla que ClaveSemilla.esProduccion (hc-auth): app.url pública https o perfil prod/production. */
    static boolean esProduccion(String appUrl, String[] perfilesActivos) {
        boolean urlPublica = appUrl != null
            && appUrl.startsWith("https://")
            && !appUrl.contains("localhost")
            && !appUrl.contains("127.0.0.1");
        boolean perfilProd = perfilesActivos != null && java.util.Arrays.stream(perfilesActivos)
            .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
        return urlPublica || perfilProd;
    }

    @PostConstruct
    void validarConfig() {
        boolean prod = esProduccion(appUrl, environment != null ? environment.getActiveProfiles() : null);
        if (prod && (claveV2 == null || claveV2.length() < 32)) {
            throw new IllegalStateException(
                "GUEST_TOKEN_SECRET no configurado o con menos de 32 caracteres; requerido en producción");
        }
        if (!prod && (claveV2 == null || claveV2.isBlank())) {
            log.warn("[guest-token] GUEST_TOKEN_SECRET vacío; se deriva una clave local (solo fuera de prod)");
        }
        limiteV1(); // valida el formato al arrancar
    }

    /** Token de cancelación (compatibilidad con los llamadores existentes). */
    public String emitir(String numeroPedido) {
        return emitir(numeroPedido, Proposito.CANCELAR);
    }

    public String emitir(String numeroPedido, Proposito proposito) {
        long exp = clock.instant().plus(VIGENCIA).getEpochSecond();
        return PREFIJO_V2 + exp + "." + firmaV2(proposito, numeroPedido, exp);
    }

    /** Valida un token de cancelación. */
    public boolean esValido(String numeroPedido, String token) {
        return esValido(numeroPedido, token, Proposito.CANCELAR);
    }

    public boolean esValido(String numeroPedido, String token, Proposito proposito) {
        if (numeroPedido == null || numeroPedido.isBlank() || token == null || token.isBlank() || proposito == null) {
            return false;
        }
        if (token.startsWith(PREFIJO_V2)) {
            return validoV2(numeroPedido, token, proposito);
        }
        return validoV1(numeroPedido, token);
    }

    private boolean validoV2(String numeroPedido, String token, Proposito proposito) {
        String[] partes = token.split("\\.", -1);
        if (partes.length != 3) return false;
        long exp;
        try {
            exp = Long.parseLong(partes[1]);
        } catch (NumberFormatException e) {
            return false;
        }
        long ahora = clock.instant().getEpochSecond();
        if (ahora >= exp) return false;
        // Un exp más allá de la vigencia máxima no lo emitió este servicio (o la clave se filtró): se rechaza.
        if (exp > ahora + VIGENCIA.plus(SKEW).getSeconds()) return false;
        return iguales(firmaV2(proposito, numeroPedido, exp), partes[2]);
    }

    private boolean validoV1(String numeroPedido, String token) {
        Instant hasta = limiteV1();
        if (hasta == null || !clock.instant().isBefore(hasta)) return false;
        return iguales(hmacHex(secret, numeroPedido), token);
    }

    private Instant limiteV1() {
        if (v1AceptarHasta == null || v1AceptarHasta.isBlank()) return null;
        try {
            return Instant.parse(v1AceptarHasta.trim());
        } catch (java.time.format.DateTimeParseException e) {
            throw new IllegalStateException("app.guest-token.v1-aceptar-hasta debe ser un instante ISO-8601 (ej. 2026-11-01T00:00:00Z)", e);
        }
    }

    private String firmaV2(Proposito proposito, String numeroPedido, long exp) {
        return hmacHex(claveEfectivaV2(), "v2|" + proposito.name() + "|" + numeroPedido + "|" + exp);
    }

    private String claveEfectivaV2() {
        if (claveV2 != null && !claveV2.isBlank()) return claveV2;
        // Solo fuera de prod (validarConfig lo impide en prod): separación de dominio respecto de v1.
        return hmacHex(secret, "guest-token-v2-clave-local");
    }

    private static boolean iguales(String esperado, String recibido) {
        return MessageDigest.isEqual(esperado.getBytes(StandardCharsets.UTF_8), recibido.getBytes(StandardCharsets.UTF_8));
    }

    private static String hmacHex(String clave, String datos) {
        try {
            Mac mac = Mac.getInstance(ALG);
            mac.init(new SecretKeySpec(clave.getBytes(StandardCharsets.UTF_8), ALG));
            return HexFormat.of().formatHex(mac.doFinal(datos.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el token de invitado", e);
        }
    }

    void setClock(Clock clock) { this.clock = clock; }
}
