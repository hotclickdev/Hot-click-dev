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
import java.util.List;

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
     * Canjea, una sola vez, un OTP ya verificado en el paso anterior (p. ej. reset-password
     * después de verify-code). Exige el mismo código: haber verificado no alcanza, porque
     * si no cualquiera que conociera el correo podría cambiar la contraseña en esa ventana.
     *
     * Reglas: verificado hace menos de {@link Constants#OTP_VENTANA_REENVIO_MIN} minutos,
     * máx {@link Constants#OTP_MAX_INTENTOS} intentos, canje atómico y de un solo uso.
     * Al canjear se dan de baja los demás OTP verificados del usuario.
     */
    @Transactional
    public boolean canjearOtpVerificado(Usuario usuario, String tipoNombre, String codigoPlano) {
        LocalDateTime ventana = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(Constants.OTP_VENTANA_REENVIO_MIN);
        List<CodigoOtp> verificados = codigoOtpRepository.findVerificadosSinCanjear(
                usuario, tipoNombre, Constants.ESTADO_ACTIVO, ventana);
        if (verificados.isEmpty()) return false;

        CodigoOtp otp = verificados.get(0);
        int intentos = otp.getAttempts() == null ? 0 : otp.getAttempts();
        if (intentos >= Constants.OTP_MAX_INTENTOS) return false;

        if (codigoPlano == null || !passwordEncoder.matches(codigoPlano, otp.getCodigoHash())) {
            codigoOtpRepository.incrementarAttempts(otp.getIdOtpCode());
            return false;
        }

        if (codigoOtpRepository.canjear(otp.getIdOtpCode(), Constants.ESTADO_ACTIVO, Constants.ESTADO_INACTIVO) == 0) {
            return false;
        }
        codigoOtpRepository.darDeBajaVerificados(usuario, tipoNombre, Constants.ESTADO_ACTIVO, Constants.ESTADO_INACTIVO);
        return true;
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
            + layout.headerConIcono(EmailLayoutHelper.FONDO_INFO, "candado", "Tu código de verificación",
                "Escribilo en la pantalla donde lo pediste.")
            + layout.abrirCuerpo()
            + layout.codigoDestacado("Código", codigoAgrupado(layout.esc(codigo)), EmailLayoutHelper.FONDO_SUAVE, true)
            + layout.notaPequena("Vence en " + minutos + " minutos. No lo compartás con nadie: HotClick nunca te lo va a pedir. "
                + "Si no fuiste vos, ignorá este correo: tu cuenta sigue segura.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);

        // El asunto NUNCA lleva el codigo: queda visible en notificaciones/lockscreen sin abrir el correo.
        resendEmailService.send(destinatario, "Tu código de verificación — HotClick", html);
    }

    /**
     * Código de 6 dígitos en dos grupos de 3 (482 913), como en Figma. El espacio es solo visual
     * (margen entre dos spans): al seleccionar y copiar el código sale sin espacios.
     */
    private String codigoAgrupado(String codigoEscapado) {
        if (codigoEscapado.length() != 6) return codigoEscapado;
        return codigoEscapado.substring(0, 3)
            + "<span style=\"margin-left:14px\">" + codigoEscapado.substring(3) + "</span>";
    }
}
