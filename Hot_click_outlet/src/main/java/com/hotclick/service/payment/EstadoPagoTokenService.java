package com.hotclick.service.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * S4-22: token firmado (HMAC-SHA256) que la página de gracias usa para consultar el estado del pago sin sesión.
 * Separado del {@code cancelToken} por prefijo: leer el estado no da permiso para cancelar y viceversa.
 */
@Service
public class EstadoPagoTokenService {

    private static final String ALG = "HmacSHA256";
    private static final String PREFIJO = "estado-pago:";

    private final byte[] secreto;

    public EstadoPagoTokenService(@Value("${jwt.secret}") String secret) {
        this.secreto = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String emitir(String numeroPedido) {
        return firmar(numeroPedido);
    }

    public boolean esValido(String numeroPedido, String token) {
        if (numeroPedido == null || numeroPedido.isBlank() || token == null || token.length() != 64) return false;
        return MessageDigest.isEqual(firmar(numeroPedido).getBytes(StandardCharsets.UTF_8),
            token.getBytes(StandardCharsets.UTF_8));
    }

    private String firmar(String numeroPedido) {
        try {
            Mac mac = Mac.getInstance(ALG);
            mac.init(new SecretKeySpec(secreto, ALG));
            return HexFormat.of().formatHex(mac.doFinal((PREFIJO + numeroPedido).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el token de estado de pago", e);
        }
    }
}
