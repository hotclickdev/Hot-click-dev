package com.hotclick.service;

import com.hotclick.model.TipoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TipoOtpRepository;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final TipoOtpRepository tipos;

    public ResetDatosCodigoService(OtpService otpService, TipoOtpRepository tipos) {
        this.otpService = otpService;
        this.tipos = tipos;
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
        asegurarTipo();
        otpService.enviarOtp(usuario, OTP_RESET_DATOS);
    }

    /**
     * V171_1 siembra el tipo en bases existentes y en base vacía con baseline ≤ V171. Una base dev
     * vacía con baseline posterior (p. ej. V172) nunca corre V171_1: el tipo se crea acá si falta.
     */
    void asegurarTipo() {
        if (tipos.findByNombre(OTP_RESET_DATOS).isPresent()) return;
        TipoOtp tipo = new TipoOtp();
        tipo.setNombre(OTP_RESET_DATOS);
        tipo.setTiempoExpiracionSeg(600);
        tipo.setLongitudCodigo(6);
        tipo.setEstado(1);
        try {
            tipos.save(tipo);
        } catch (DataIntegrityViolationException carrera) {
            // otro request lo creó a la vez: ya existe
        }
    }
}
