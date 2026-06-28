package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.TipoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CodigoOtpRepository;
import com.hotclick.repository.TipoOtpRepository;
import com.hotclick.exception.RecursoNoEncontradoException;
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

    private void enviarEmail(String destinatario, String nombre, String codigo, int expiracionSeg) {
        int minutos = expiracionSeg / 60;
        // Plantilla del Brand Book v1.1 (cap. 12.1): header azul 900 con wordmark bicolor,
        // cuerpo claro, semánticos del cap. 3.3. Sin emojis en correos de sistema (cap. 10.3).
        String html = """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#F8F9FB;font-family:'Public Sans',Arial,Helvetica,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:48px 16px;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0"
                    style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4E7EC;max-width:520px;width:100%%;">
                    <!-- Header -->
                    <tr>
                      <td style="background:#152B5E;padding:28px 32px;text-align:center;">
                        <span style="font-family:'Sora','Arial Black',Arial,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px;">
                          <span style="color:#F0524A;">Hot</span><span style="color:#FFFFFF;">Click</span>
                        </span>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 36px 32px;">
                        <h2 style="margin:0 0 8px;color:#14171C;font-size:22px;font-weight:700;font-family:'Sora','Arial Black',Arial,sans-serif;">
                          Hola, %s.
                        </h2>
                        <p style="color:#4D5560;margin:0 0 28px;font-size:15px;line-height:1.65;">
                          Usá el siguiente código para verificar tu cuenta. Expira en <strong style="color:#14171C;">%d minutos</strong>.
                        </p>

                        <!-- Código -->
                        <div style="text-align:center;margin:0 0 28px;">
                          <div style="display:inline-block;background:#EFF4FE;border:2px solid #C2D5F9;
                                      border-radius:16px;padding:24px 48px;">
                            <span style="font-size:46px;font-weight:900;color:#14171C;letter-spacing:16px;
                                         font-family:'IBM Plex Mono','Courier New',monospace;display:block;line-height:1;">%s</span>
                            <span style="font-size:11px;color:#6E7682;letter-spacing:1px;text-transform:uppercase;margin-top:8px;display:block;">
                              Código de verificación
                            </span>
                          </div>
                        </div>

                        <!-- Aviso de seguridad destacado -->
                        <div style="background:#FDF3DC;border:1px solid #EBD9A8;
                                    border-radius:12px;padding:16px 20px;margin-bottom:8px;">
                          <p style="margin:0;font-size:13px;color:#9A6700;line-height:1.6;">
                            <strong>Este código es solo para verificar tu cuenta.</strong><br>
                            <span>No lo compartás con nadie. HotClick nunca te va a pedir este código.</span>
                          </p>
                        </div>

                        <p style="color:#9AA1AE;font-size:12px;margin:12px 0 0;text-align:center;line-height:1.5;">
                          Si no creaste esta cuenta, ignorá este correo.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#14171C;padding:18px 36px;text-align:center;">
                        <p style="margin:0;color:#6E7682;font-size:12px;">
                          © 2026 HotClick — Todos los derechos reservados
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, minutos, codigo);

        resendEmailService.send(destinatario, "Tu código de verificación — HotClick", html);
    }
}
