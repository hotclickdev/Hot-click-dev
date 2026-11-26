package com.hotclick.agente.webhook;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Autenticidad del webhook de Meta.
 *
 * <ul>
 *   <li>Suscripción (GET): Meta manda {@code hub.verify_token}; debe coincidir con {@code meta.webhook.verify-token}.</li>
 *   <li>Eventos (POST): Meta firma el cuerpo crudo con HMAC-SHA256 usando el secreto de la app y lo manda en
 *       {@code X-Hub-Signature-256: sha256=<hex>}.</li>
 * </ul>
 * Fail-closed: si falta el secreto o el token en la configuración, se rechaza todo.
 * Las comparaciones son de tiempo constante.
 */
@Component
public class MetaWebhookFirma {

    static final String PREFIJO = "sha256=";

    private final byte[] appSecret;
    private final byte[] verifyToken;

    public MetaWebhookFirma(@Value("${meta.app-secret:}") String appSecret,
                            @Value("${meta.webhook.verify-token:}") String verifyToken) {
        this.appSecret = appSecret == null ? new byte[0] : appSecret.trim().getBytes(StandardCharsets.UTF_8);
        this.verifyToken = verifyToken == null ? new byte[0] : verifyToken.trim().getBytes(StandardCharsets.UTF_8);
    }

    public boolean configurado() {
        return appSecret.length > 0 && verifyToken.length > 0;
    }

    public boolean tokenValido(String recibido) {
        if (verifyToken.length == 0 || recibido == null || recibido.isEmpty()) return false;
        return MessageDigest.isEqual(verifyToken, recibido.getBytes(StandardCharsets.UTF_8));
    }

    public boolean firmaValida(byte[] cuerpo, String cabecera) {
        if (appSecret.length == 0 || cuerpo == null || cabecera == null || !cabecera.startsWith(PREFIJO)) return false;
        byte[] recibida;
        try {
            recibida = HexFormat.of().parseHex(cabecera.substring(PREFIJO.length()).trim().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return false;
        }
        return MessageDigest.isEqual(calcular(cuerpo), recibida);
    }

    byte[] calcular(byte[] cuerpo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret, "HmacSHA256"));
            return mac.doFinal(cuerpo);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 no disponible", e);
        }
    }
}
