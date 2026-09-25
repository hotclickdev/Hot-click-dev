package com.hotclick.service.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Token HMAC para cancelar pedidos de invitado sin exponer cancelación abierta
 * por solo conocer el número de pedido.
 */
@Service
public class GuestCancelTokenService {

    private static final String ALG = "HmacSHA256";

    @Value("${jwt.secret}")
    private String secret;

    public String emitir(String numeroPedido) {
        return firmado(numeroPedido);
    }

    public boolean esValido(String numeroPedido, String token) {
        if (numeroPedido == null || numeroPedido.isBlank() || token == null || token.isBlank()) {
            return false;
        }
        byte[] esperado = firmado(numeroPedido).getBytes(StandardCharsets.UTF_8);
        byte[] recibido = token.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(esperado, recibido);
    }

    private String firmado(String numeroPedido) {
        try {
            Mac mac = Mac.getInstance(ALG);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALG));
            return HexFormat.of().formatHex(mac.doFinal(numeroPedido.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar cancelToken", e);
        }
    }
}
