package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gestiona el flujo de registro con verificación de correo.
 * La lógica de OTP (generación, hashing, rate limit, brute-force) vive en OtpService.
 */
@Service
public class EmailVerificationService {

    @Autowired private OtpService otpService;
    @Autowired private UsuarioService usuarioService;

    /**
     * Paso 1 del registro: crea la cuenta como PENDIENTE y envía el OTP.
     * Si el correo ya existe con estado PENDIENTE, reenvía un código nuevo.
     */
    @Transactional
    public void iniciarRegistro(Usuario usuario) throws Exception {
        if (usuario.getCorreo() == null || usuario.getCorreo().isBlank()) {
            throw new RuntimeException("El correo es requerido");
        }

        Usuario pendiente = usuarioService.buscarPorCorreo(usuario.getCorreo().trim().toLowerCase())
                .orElse(null);

        if (pendiente != null) {
            if (pendiente.getEstado() != null && pendiente.getEstado() == Constants.ESTADO_ACTIVO) {
                throw new RuntimeException("El correo ya está registrado");
            }
            // Cuenta existe pero está PENDIENTE → reenviar código
            otpService.enviarOtp(pendiente, Constants.OTP_TIPO_REGISTRO);
            return;
        }

        Usuario nuevo = usuarioService.registrarPendiente(usuario);
        otpService.enviarOtp(nuevo, Constants.OTP_TIPO_REGISTRO);
    }

    /**
     * Paso 2 del registro: verifica el OTP y activa la cuenta.
     */
    @Transactional
    public Usuario verificarYRegistrar(String correo, String codigoPlano) {
        Usuario usuario = usuarioService.buscarPorCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("No se encontró una cuenta para ese correo"));

        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_ACTIVO) {
            throw new RuntimeException("La cuenta ya está verificada. Podés iniciar sesión.");
        }

        CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_REGISTRO, codigoPlano);
        otpService.marcarUsado(otp);
        usuarioService.activarUsuario(usuario.getId());

        return usuarioService.buscarPorId(usuario.getId())
                .orElseThrow(() -> new RuntimeException("Error al recuperar la cuenta activada"));
    }
}
