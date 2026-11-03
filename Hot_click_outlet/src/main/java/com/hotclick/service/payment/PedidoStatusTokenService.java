package com.hotclick.service.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.function.LongSupplier;

/**
 * Token firmado de vida corta que viaja en la URL de retorno de ONVO ({@code /pago/exito?order=…&st=…})
 * para que el comprador sin sesión pueda LEER el estado de su pedido. Solo sirve para
 * {@code GET /payments/status}: no cancela ni modifica nada (el cancelToken es otro HMAC, sin vencimiento
 * ni prefijo, y nunca coincide con este formato).
 *
 * <p>Formato: {@code <vence-epoch-seg>.<hex HMAC-SHA256("status|" + numeroPedido + "|" + vence)>}.
 * La clave es la misma {@code jwt.secret} de la configuración; nada hardcodeado. La firma se compara en
 * tiempo constante. El token nunca se registra en logs.
 */
@Service
public class PedidoStatusTokenService {

    private static final String ALG = "HmacSHA256";
    private static final String PROPOSITO = "status|";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${hotclick.pagos.status-token-minutos:60}")
    private long vidaMinutos = 60;

    LongSupplier relojSegundos = () -> System.currentTimeMillis() / 1000L;

    public String emitir(String numeroPedido) {
        long vence = relojSegundos.getAsLong() + Math.max(1, vidaMinutos) * 60L;
        return vence + "." + firma(numeroPedido, vence);
    }

    public boolean esValido(String numeroPedido, String token) {
        if (numeroPedido == null || numeroPedido.isBlank() || token == null || token.length() > 128) return false;
        int punto = token.indexOf('.');
        if (punto <= 0 || punto == token.length() - 1) return false;
        long vence;
        try {
            vence = Long.parseLong(token.substring(0, punto));
        } catch (NumberFormatException e) {
            return false;
        }
        byte[] esperado = firma(numeroPedido, vence).getBytes(StandardCharsets.UTF_8);
        byte[] recibido = token.substring(punto + 1).getBytes(StandardCharsets.UTF_8);
        boolean firmaOk = MessageDigest.isEqual(esperado, recibido);
        return firmaOk && relojSegundos.getAsLong() < vence;
    }

    private String firma(String numeroPedido, long vence) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Sin clave para firmar el token de estado");
        }
        try {
            Mac mac = Mac.getInstance(ALG);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALG));
            return HexFormat.of().formatHex(
                mac.doFinal((PROPOSITO + numeroPedido + "|" + vence).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el token de estado", e);
        }
    }
}
