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
 * El cliente lo trata como opaco (mismo campo {@code sesionId}), así que el frontend no cambia.
 * Un sesionId sin firma válida (forjado o legado) se trata como sesión nueva / inexistente.
 *
 * <p>Secreto: {@code asistente.sesion.secret}, o en su defecto {@code jwt.secret} (ya obligatorio
 * en prod vía JWT_SECRET) con separación de dominio. Sin secreto: fail-closed al arrancar, salvo
 * perfiles dev/test donde se genera una clave efímera.
 */
@Component
public class ShoppingAssistantSesionFirma {

    private static final String ALG = "HmacSHA256";
    private static final String DOMINIO = "hotclick-asistente-sesion-v1:";

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
            clave = (DOMINIO + secretoConfig).getBytes(StandardCharsets.UTF_8);
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

    public String firmar(UUID sesionId) {
        return sesionId + "." + mac(sesionId.toString());
    }

    /** UUID si el token es {@code uuid.firma} válido; null en cualquier otro caso. */
    public UUID verificar(String token) {
        if (token == null) return null;
        String t = token.trim();
        int punto = t.indexOf('.');
        if (punto != 36 || t.length() > 80) return null;
        String uuidStr = t.substring(0, punto);
        UUID uuid;
        try {
            uuid = UUID.fromString(uuidStr);
        } catch (IllegalArgumentException e) {
            return null;
        }
        if (!uuid.toString().equals(uuidStr)) return null;
        byte[] esperado = mac(uuidStr).getBytes(StandardCharsets.UTF_8);
        byte[] recibido = t.substring(punto + 1).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(esperado, recibido) ? uuid : null;
    }

    private String mac(String dato) {
        if (clave == null) throw new IllegalStateException("firma de sesión no inicializada");
        try {
            Mac m = Mac.getInstance(ALG);
            m.init(new SecretKeySpec(clave, ALG));
            byte[] full = m.doFinal(dato.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(full, 0, 16);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar sesión", e);
        }
    }
}
