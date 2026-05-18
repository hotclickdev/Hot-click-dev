package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

/**
 * Gestiona el flujo de recuperación de contraseña.
 * La lógica de OTP (generación, hashing, rate limit, brute-force) vive en OtpService.
 */
@Service
public class PasswordResetService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private OtpService otpService;
    @Autowired private PasswordEncoder passwordEncoder;

    /** Paso 1: envía el código al correo si existe. Silencioso si no existe (anti-enumeración). */
    public void enviarCodigo(String correo) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(correo.trim().toLowerCase());
        if (usuarioOpt.isEmpty()) return;

        Usuario usuario = usuarioOpt.get();
        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_PENDIENTE) {
            throw new RuntimeException("La cuenta no ha sido verificada. Completá el registro primero.");
        }

        otpService.enviarOtp(usuario, Constants.OTP_TIPO_RESET_PASSWORD);
    }

    /**
     * Paso 2: verifica el código. Lanza excepción con mensaje si falla.
     * El OTP queda marcado como usado internamente para impedir reutilización.
     */
    @Transactional
    public void verificarCodigo(String correo, String codigoPlano) {
        Usuario usuario = usuarioRepository.findByCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Correo no encontrado"));

        CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_RESET_PASSWORD, codigoPlano);
        otpService.marcarUsado(otp);
    }

    /**
     * Paso 3: cambia la contraseña.
     * Solo procede si no hay OTP activo de RESET (ya fue consumido en paso 2).
     */
    @Transactional
    public boolean cambiarContrasena(String correo, String nuevaContrasena) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(correo.trim().toLowerCase());
        if (usuarioOpt.isEmpty()) return false;

        Usuario usuario = usuarioOpt.get();
        usuario.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
        return true;
    }
}
