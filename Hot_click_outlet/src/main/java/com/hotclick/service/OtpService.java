package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.TipoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CodigoOtpRepository;
import com.hotclick.repository.TipoOtpRepository;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.email.EmailLayoutHelper;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    @Autowired private CodigoOtpRepository codigoOtpRepository;
    @Autowired private TipoOtpRepository tipoOtpRepository;
    @Autowired private ResendEmailService resendEmailService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailLayoutHelper layout;

    private final SecureRandom random = new SecureRandom();

    /**
     * Genera y envía un OTP al correo del usuario.
     * Rate limit: máx 3 códigos en la ventana de 10 minutos.
     * Invalida OTPs anteriores del mismo tipo antes de crear uno nuevo.
     */
    @Transactional
    public void enviarOtp(Usuario usuario, String tipoNombre) {
        TipoOtp tipo = tipoOtpRepository.findByNombre(tipoNombre)
                .orElseThrow(() -> new RecursoNoEncontradoException("Tipo de OTP no configurado: " + tipoNombre));

        LocalDateTime ventana = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(Constants.OTP_VENTANA_REENVIO_MIN);
        long recientes = codigoOtpRepository.countRecentOtps(usuario, tipoNombre, ventana);
        if (recientes >= Constants.OTP_MAX_REENVIOS) {
            throw new IllegalStateException(
                "Demasiadas solicitudes. Esperá " + Constants.OTP_VENTANA_REENVIO_MIN + " minutos antes de pedir otro código.");
        }

        codigoOtpRepository.invalidarOtpsAnteriores(usuario, tipoNombre);

        String codigoPlano = String.format("%06d", random.nextInt(1_000_000));
        String codigoHash  = passwordEncoder.encode(codigoPlano);

        CodigoOtp otp = new CodigoOtp();
        otp.setUsuario(usuario);
        otp.setTipoOtp(tipo);
        otp.setCodigoHash(codigoHash);
        otp.setExpiresAt(LocalDateTime.now(Constants.ZONA_CR).plusSeconds(tipo.getTiempoExpiracionSeg()));
        otp.setAttempts(0);
        otp.setActiveFlag(true);
        codigoOtpRepository.save(otp);

        enviarEmail(usuario.getCorreo(), usuario.getNombre(), codigoPlano, tipo.getTiempoExpiracionSeg());
    }

    /**
     * Verifica el código OTP ingresado por el usuario.
     * Anti-brute force: máx 5 intentos antes de invalidar el OTP.
     * Retorna el CodigoOtp validado para que el llamador lo marque como usado.
     */
    @Transactional
    public CodigoOtp verificarOtp(Usuario usuario, String tipoNombre, String codigoPlano) {
        CodigoOtp otp = codigoOtpRepository
                .findTopByUsuarioAndTipoOtpNombreAndActiveFlagTrueOrderByIdOtpCodeDesc(usuario, tipoNombre)
                .orElseThrow(() -> new IllegalStateException("No hay un código activo. Solicitá uno nuevo."));

        if (otp.isExpired()) {
            codigoOtpRepository.invalidar(otp.getIdOtpCode());
            throw new IllegalStateException("El código ha expirado. Solicitá uno nuevo.");
        }

        codigoOtpRepository.incrementarAttempts(otp.getIdOtpCode());
        int intentosUsados = otp.getAttempts() + 1;

        if (!passwordEncoder.matches(codigoPlano, otp.getCodigoHash())) {
            int restantes = Constants.OTP_MAX_INTENTOS - intentosUsados;
            if (intentosUsados >= Constants.OTP_MAX_INTENTOS) {
                codigoOtpRepository.invalidar(otp.getIdOtpCode());
                throw new IllegalArgumentException("Demasiados intentos fallidos. Solicitá un código nuevo.");
            }
            throw new IllegalArgumentException("Código incorrecto. " + restantes + " intento(s) restante(s).");
        }

        return otp;
    }

    /**
     * Verifica que exista un OTP consumido recientemente (paso 2 completado).
     * Impide saltar el verify-code e ir directo a reset-password.
     */
    public boolean tieneOtpConsumidoReciente(Usuario usuario, String tipoNombre) {
        LocalDateTime ventana = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(Constants.OTP_VENTANA_REENVIO_MIN);
        return codigoOtpRepository.countRecentlyConsumedOtps(usuario, tipoNombre, ventana) > 0;
    }

    /**
     * Marca el OTP como usado (consumed). Llamar después de verificarOtp exitoso.
     */
    @Transactional
    public void marcarUsado(CodigoOtp otp) {
        otp.setUsedAt(LocalDateTime.now(Constants.ZONA_CR));
        otp.setActiveFlag(false);
        codigoOtpRepository.save(otp);
    }

    /**
     * Sends a 2FA login OTP.  Same mechanism as enviarOtp() but uses the
     * 2FA_LOGIN type (5 min expiry) and a security-focused email template.
     */
    @Transactional
    public void enviarOtp2Fa(Usuario usuario) {
        enviarOtp(usuario, Constants.OTP_TIPO_2FA_LOGIN);
    }

    /**
     * Plantilla del Figma "08 · QR y correos → Correo · Código de verificación":
     * esqueleto compartido de {@link EmailLayoutHelper}, código en recuadro azul y aviso de seguridad.
     */
    private void enviarEmail(String destinatario, String nombre, String codigo, int expiracionSeg) {
        int minutos = expiracionSeg / 60;
        String html = layout.abrirHtml()
            + layout.header("Tu código de verificación", "Escribilo en la pantalla donde lo pediste.")
            + layout.abrirCuerpo()
            + layout.parrafo("Hola, <strong>" + layout.esc(nombre) + "</strong>. Usá este código para verificar tu cuenta.")
            + layout.datoDestacado("Código", layout.esc(codigo), "#EFF4FE", "#C2D5F9")
            + "<div style=\"background:#FDF3DC;border:1px solid #EBD9A8;border-radius:12px;padding:16px 20px;margin-bottom:8px\">"
            + "<p style=\"margin:0;font-size:13px;color:#9A6700;line-height:1.6\">"
            + "<strong>Vence en " + minutos + " minutos.</strong> No lo compartás con nadie: HotClick nunca te lo va a pedir. "
            + "Si no fuiste vos, ignorá este correo — tu cuenta sigue segura.</p></div>"
            + layout.footer("¿No pediste este código?");

        resendEmailService.send(destinatario, "Tu código de verificación: " + codigo, html);
    }
}
