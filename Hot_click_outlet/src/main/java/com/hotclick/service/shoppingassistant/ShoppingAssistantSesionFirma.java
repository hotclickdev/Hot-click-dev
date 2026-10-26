package com.hotclick.service.shoppingassistant;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.UUID;

/**
 * ALTO-1: token de sesión firmado del asistente público, formato {@code <uuid>.<hmac128-hex>}.
 * La firma cubre {@code empresaId|uuid}: un token emitido para una tienda no vale en otra.
 * El cliente lo trata como opaco (mismo campo {@code sesionId}), así que el frontend no cambia.
 *
 * <p>Clave derivada: {@code HMAC-SHA256(secreto, "hotclick-asistente-sesion-v1")}, con
 * secreto = {@code asistente.sesion.secret} o, en su defecto, {@code jwt.secret}. Sin secreto:
 * fail-closed al arrancar, salvo perfiles dev/test donde se genera una clave efímera.
 */
@Component
public class ShoppingAssistantSesionFirma {

    private static final String ALG = "HmacSHA256";
    static final String DOMINIO = "hotclick-asistente-sesion-v1";

    private final String secretoConfig;
    private final Environment env;
    private byte[] clave;

    public ShoppingAssistantSesionFirma(
            @Value("${asistente.sesion.secret:${jwt.secret:}}") String secretoConfig,
            Environment env) {
        this.secretoConfig = secretoConfig;
        this.env = env;
    }

    @PostConstruct
    void init() {
        if (secretoConfig != null && secretoConfig.length() >= 32) {
            clave = hmac(secretoConfig.getBytes(StandardCharsets.UTF_8), DOMINIO);
            return;
        }
        boolean devOTest = Arrays.stream(env.getActiveProfiles())
            .anyMatch(p -> p.equals("dev") || p.equals("test"));
        if (!devOTest) {
            throw new IllegalStateException(
                "asistente: falta secreto de sesión (asistente.sesion.secret o jwt.secret ≥32 chars)");
        }
        clave = new byte[32];
        new SecureRandom().nextBytes(clave);
    }

    public String firmar(Long empresaId, UUID sesionId) {
        if (empresaId == null) throw new IllegalArgumentException("empresaId requerido");
        return sesionId + "." + mac(empresaId, sesionId.toString());
    }

    /** UUID del token sin verificar la firma (sólo para buscar la empresa dueña); null si mal formado. */
    public static UUID uuidDe(String token) {
        if (token == null) return null;
        String t = token.trim();
        if (t.indexOf('.') != 36 || t.length() > 80) return null;
        String uuidStr = t.substring(0, 36);
        try {
            UUID u = UUID.fromString(uuidStr);
            return u.toString().equals(uuidStr) ? u : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** UUID si el token es {@code uuid.firma} válido PARA ESTA empresa; null en cualquier otro caso. */
    public UUID verificar(String token, Long empresaId) {
        if (empresaId == null) return null;
        UUID uuid = uuidDe(token);
        if (uuid == null) return null;
        byte[] esperado = mac(empresaId, uuid.toString()).getBytes(StandardCharsets.UTF_8);
        byte[] recibido = token.trim().substring(37).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(esperado, recibido) ? uuid : null;
    }

    private String mac(Long empresaId, String uuid) {
        if (clave == null) throw new IllegalStateException("firma de sesión no inicializada");
        return HexFormat.of().formatHex(hmac(clave, empresaId + "|" + uuid), 0, 16);
    }

    private static byte[] hmac(byte[] k, String dato) {
        try {
            Mac m = Mac.getInstance(ALG);
            m.init(new SecretKeySpec(k, ALG));
            return m.doFinal(dato.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar sesión", e);
        }
    }
}
