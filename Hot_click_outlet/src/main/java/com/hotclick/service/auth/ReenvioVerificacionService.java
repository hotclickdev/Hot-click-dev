package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.concurrent.Executor;

/**
 * QA4-004: reenvío público del código de verificación desde /login.
 *
 * Anti-enumeración: la respuesta es siempre la misma (200 + mensaje genérico), exista o no
 * la cuenta y esté o no verificada. La búsqueda y el envío corren en el executor async, así
 * que el tiempo de respuesta no depende del estado de la cuenta.
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
    static final int MAX_POR_CORREO = 3;
    static final int VENTANA_CORREO_SEG = 900;

    private final UsuarioService usuarioService;
    private final OtpService otpService;
    private final RateLimiter rateLimiter;
    private final Executor executor;

    public ReenvioVerificacionService(UsuarioService usuarioService, OtpService otpService,
                                      RateLimiter rateLimiter,
                                      @Qualifier("taskExecutor") Executor executor) {
        this.usuarioService = usuarioService;
        this.otpService = otpService;
        this.rateLimiter = rateLimiter;
        this.executor = executor;
    }

    public ResponseEntity<ResponseDTO> reenviar(String correoCrudo) {
        String correo = correoCrudo == null ? "" : correoCrudo.trim().toLowerCase(Locale.ROOT);
        if (correo.isEmpty() || correo.length() > 150 || !correo.contains("@")) {
            return generico();
        }
        if (!rateLimiter.tryAcquire("reenvio-verif:correo:" + hash(correo), MAX_POR_CORREO, VENTANA_CORREO_SEG)) {
            return ResponseEntity.status(429).body(ResponseDTO.error(MSG_LIMITE));
        }
        try {
            executor.execute(() -> enviarSiPendiente(correo));
        } catch (Exception e) {
            log.warn("[reenvio-verificacion] no se pudo encolar: {}", e.getClass().getSimpleName());
        }
        return generico();
    }

    void enviarSiPendiente(String correo) {
        try {
            Usuario u = usuarioService.buscarPorCorreo(correo).orElse(null);
            if (u == null || u.getEstado() == null || u.getEstado() != Constants.ESTADO_PENDIENTE) return;
            otpService.enviarOtp(u, Constants.OTP_TIPO_REGISTRO);
        } catch (Exception e) {
            log.warn("[reenvio-verificacion] envío fallido: {}", e.getClass().getSimpleName());
        }
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
