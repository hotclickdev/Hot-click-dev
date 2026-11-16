package com.hotclick.service;

import java.util.Locale;
import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.exception.RecursoNoEncontradoException;
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

    static final String MSG_CUENTA_NO_ENCONTRADA = "No se encontró una cuenta para ese correo";

    private static boolean esVacio(String s) {
        return s == null || s.isBlank();
    }

    @Autowired private OtpService otpService;
    @Autowired private UsuarioService usuarioService;

    /**
     * Paso 1 del registro: crea la cuenta como PENDIENTE y envía el OTP.
     * Si el correo ya existe con estado PENDIENTE, reenvía un código nuevo.
     */
    @Transactional
    public void iniciarRegistro(Usuario usuario) {
        if (usuario.getCorreo() == null || usuario.getCorreo().isBlank()) {
            throw new IllegalArgumentException("El correo es requerido");
        }

        Usuario pendiente = usuarioService.buscarPorCorreo(usuario.getCorreo().trim().toLowerCase(Locale.ROOT))
                .orElse(null);

        if (pendiente != null) {
            if (pendiente.getEstado() != null && pendiente.getEstado() == Constants.ESTADO_ELIMINADO) {
                pendiente = null; // cuenta eliminada → permitir nuevo registro con ese correo
            } else if (pendiente.getEstado() != null && pendiente.getEstado() == Constants.ESTADO_ACTIVO) {
                throw new IllegalArgumentException("El correo ya está registrado");
            } else {
                // Cuenta existe pero está PENDIENTE → reenviar código. Si quedó sin hash (alta anterior al
                // chequeo de contraseña), se guarda el hash nuevo (ya viene BCrypt desde el handler); nunca se
                // sobrescribe un hash existente, así quien reinicia el alta ajena no cambia su contraseña.
                if (esVacio(pendiente.getContrasenaHash()) && !esVacio(usuario.getContrasenaHash())) {
                    pendiente.setContrasenaHash(usuario.getContrasenaHash());
                    usuarioService.guardar(pendiente);
                }
                otpService.enviarOtp(pendiente, Constants.OTP_TIPO_REGISTRO);
                return;
            }
        }

        Usuario nuevo = usuarioService.registrarPendiente(usuario);
        otpService.enviarOtp(nuevo, Constants.OTP_TIPO_REGISTRO);
    }

    /**
     * Paso 2 del registro: verifica el OTP y activa la cuenta.
     */
    @Transactional
    public Usuario verificarYRegistrar(String correo, String codigoPlano) {
        Usuario usuario = usuarioService.buscarPorCorreo(correo.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new RecursoNoEncontradoException(MSG_CUENTA_NO_ENCONTRADA));

        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_ACTIVO) {
            throw new IllegalStateException("La cuenta ya está verificada. Podés iniciar sesión.");
        }

        // Cuenta sin credencial (alta anterior al chequeo de contraseña): no se activa ni emite token.
        if (usuario.getContrasenaHash() == null || usuario.getContrasenaHash().isBlank()) {
            // Mismo mensaje que cuenta inexistente: no revela que la cuenta existe ni que le falta hash.
            throw new RecursoNoEncontradoException(MSG_CUENTA_NO_ENCONTRADA);
        }

        CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_REGISTRO, codigoPlano);
        otpService.marcarUsado(otp);
        usuarioService.activarUsuario(usuario.getId());

        return usuarioService.buscarPorId(usuario.getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Error al recuperar la cuenta activada"));
    }
}
