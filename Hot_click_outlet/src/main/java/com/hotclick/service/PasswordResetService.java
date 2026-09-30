package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Gestiona el flujo de recuperación de contraseña por código de 6 dígitos (3 pasos:
 * correo → código → nueva contraseña).
 * La lógica de OTP (generación, hashing, rate limit, brute-force, canje) vive en OtpService.
 *
 * Anti-enumeración: ningún paso distingue "el correo no existe" de "no hay código válido".
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    /** Mismo mensaje para correo inexistente y para "no hay código": no revela si la cuenta existe. */
    public static final String MSG_SIN_CODIGO_ACTIVO = "No hay un código activo. Solicitá uno nuevo.";

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private OtpService otpService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RefreshTokenService refreshTokenService;

    /**
     * Paso 1: envía el código al correo si la cuenta existe y está verificada.
     * Silencioso en cualquier otro caso (anti-enumeración). Puede lanzar si se excede el
     * límite de reenvíos; el llamador responde igual que en el caso exitoso.
     */
    public void enviarCodigo(String correo) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(normalizar(correo));
        if (usuarioOpt.isEmpty()) return;

        Usuario usuario = usuarioOpt.get();
        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_PENDIENTE) {
            log.info("[forgot-password] cuenta pendiente de verificación, no se envía código (id={})", usuario.getId());
            return;
        }

        otpService.enviarOtp(usuario, Constants.OTP_TIPO_RESET_PASSWORD);
    }

    /**
     * Paso 2: verifica el código. Lanza excepción con mensaje si falla.
     * El OTP queda marcado como usado; el paso 3 lo canjea presentando el mismo código.
     */
    @Transactional
    public void verificarCodigo(String correo, String codigoPlano) {
        Usuario usuario = usuarioRepository.findByCorreo(normalizar(correo))
                .orElseThrow(() -> new IllegalStateException(MSG_SIN_CODIGO_ACTIVO));

        CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_RESET_PASSWORD, codigoPlano);
        // El paso 3 arranca con su propio presupuesto de intentos.
        otp.setAttempts(0);
        otpService.marcarUsado(otp);
    }

    /**
     * Paso 3: cambia la contraseña. Exige el mismo código verificado en el paso 2
     * (de un solo uso y dentro de la ventana). Devuelve el usuario si se cambió.
     */
    @Transactional
    public Optional<Usuario> cambiarContrasena(String correo, String codigoPlano, String nuevaContrasena) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(normalizar(correo));
        if (usuarioOpt.isEmpty()) return Optional.empty();

        Usuario usuario = usuarioOpt.get();
        if (!otpService.canjearOtpVerificado(usuario, Constants.OTP_TIPO_RESET_PASSWORD, codigoPlano)) {
            return Optional.empty();
        }

        usuario.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuario.setBloqueadoHasta(null);
        usuario.setIntentosFallidos(0);
        // Si alguien más tenía una sesión abierta (p.ej. cuenta comprometida), este reset la tumba.
        usuario.setSesionesInvalidadasEn(LocalDateTime.now(Constants.ZONA_CR));
        usuarioRepository.save(usuario);
        refreshTokenService.revocarTodosDeUsuario(usuario);
        return Optional.of(usuario);
    }

    private static String normalizar(String correo) {
        return correo.trim().toLowerCase();
    }
}
