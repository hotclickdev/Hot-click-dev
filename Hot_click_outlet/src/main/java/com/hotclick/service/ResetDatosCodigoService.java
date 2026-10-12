package com.hotclick.service;

import com.hotclick.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * seg-altos-2 (c): verifica el código de borrado de datos de una cuenta SSO. Corre fuera de la
 * transacción del borrado (NOT_SUPPORTED): un código incorrecto no deja esa transacción marcada
 * para rollback y el OTP se gestiona en su propia transacción.
 */
@Service
public class ResetDatosCodigoService {

    public static final String OTP_RESET_DATOS = "RESET_DATOS";

    private final OtpService otpService;

    public ResetDatosCodigoService(OtpService otpService) {
        this.otpService = otpService;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public boolean canjear(Usuario usuario, String codigo) {
        try {
            otpService.marcarUsado(otpService.verificarOtp(usuario, OTP_RESET_DATOS, codigo));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void enviar(Usuario usuario) {
        otpService.enviarOtp(usuario, OTP_RESET_DATOS);
    }
}
