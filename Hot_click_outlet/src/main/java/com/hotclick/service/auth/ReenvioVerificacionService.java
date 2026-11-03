package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

/**
 * QA4-004: reenvío público del código de verificación desde /login.
 *
 * Anti-enumeración: si la cuenta no existe o ya está verificada la respuesta es la misma
 * (200 + mensaje genérico).
 *
 * QA4-013 (fail-closed): el envío es síncrono y la respuesta refleja el resultado real. Antes el
 * envío corría en el executor async y cualquier fallo (p. ej. el tope de OtpService, que lanza
 * IllegalStateException) solo quedaba en un WARN mientras la UI decía "te enviamos un correo".
 * Ahora: tope alcanzado → 429 con el mismo texto que el tope por correo; fallo del proveedor
 * de correo → 503.
 *
 * Rate limit: por IP en RateLimitingFilter y por correo aquí (clave con hash, sin PII en la tabla).
 * Además OtpService limita a {@link Constants#OTP_MAX_REENVIOS} códigos por ventana y usuario.
 */
@Service
public class ReenvioVerificacionService {

    private static final Logger log = LoggerFactory.getLogger(ReenvioVerificacionService.class);

    public static final String MSG_GENERICO =
        "Si la cuenta existe y falta verificarla, te enviamos un correo con el código.";
    public static final String MSG_LIMITE = "Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo.";
    public static final String MSG_FALLO_ENVIO =
        "No pudimos enviar el correo con el código. Intentá de nuevo en unos minutos.";
    static final int MAX_POR_CORREO = 3;
    static final int VENTANA_CORREO_SEG = 900;

    private final UsuarioService usuarioService;
    private final OtpService otpService;
    private final RateLimiter rateLimiter;

    public ReenvioVerificacionService(UsuarioService usuarioService, OtpService otpService,
                                      RateLimiter rateLimiter) {
        this.usuarioService = usuarioService;
        this.otpService = otpService;
        this.rateLimiter = rateLimiter;
    }

    public ResponseEntity<ResponseDTO> reenviar(String correoCrudo) {
        String correo = correoCrudo == null ? "" : correoCrudo.trim().toLowerCase(Locale.ROOT);
        if (correo.isEmpty() || correo.length() > 150 || !correo.contains("@")) {
            return generico();
        }
        if (!rateLimiter.tryAcquire("reenvio-verif:correo:" + hash(correo), MAX_POR_CORREO, VENTANA_CORREO_SEG)) {
            return ResponseEntity.status(429).body(ResponseDTO.error(MSG_LIMITE));
        }
        Usuario u = usuarioService.buscarPorCorreo(correo).orElse(null);
        if (u == null || u.getEstado() == null || u.getEstado() != Constants.ESTADO_PENDIENTE) {
            return generico();
        }
        try {
            otpService.enviarOtp(u, Constants.OTP_TIPO_REGISTRO);
        } catch (IllegalStateException e) {
            // Tope de OtpService (OTP_MAX_REENVIOS por ventana): no se envió nada.
            log.warn("[reenvio-verificacion] tope de códigos alcanzado");
            return ResponseEntity.status(429).body(ResponseDTO.error(MSG_LIMITE));
        } catch (Exception e) {
            log.warn("[reenvio-verificacion] envío fallido: {}", e.getClass().getSimpleName());
            return ResponseEntity.status(503).body(ResponseDTO.error(MSG_FALLO_ENVIO));
        }
        return generico();
    }

    private static ResponseEntity<ResponseDTO> generico() {
        return ResponseEntity.ok(ResponseDTO.success(MSG_GENERICO, null));
    }

    static String hash(String correo) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(correo.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
