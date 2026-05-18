package com.hotclick.service;

import com.hotclick.model.CodigoOtp;
import com.hotclick.model.TipoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CodigoOtpRepository;
import com.hotclick.repository.TipoOtpRepository;
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
                .orElseThrow(() -> new RuntimeException("Tipo de OTP no configurado: " + tipoNombre));

        LocalDateTime ventana = LocalDateTime.now().minusMinutes(Constants.OTP_VENTANA_REENVIO_MIN);
        long recientes = codigoOtpRepository.countRecentOtps(usuario, tipoNombre, ventana);
        if (recientes >= Constants.OTP_MAX_REENVIOS) {
            throw new RuntimeException(
                "Demasiadas solicitudes. Esperá " + Constants.OTP_VENTANA_REENVIO_MIN + " minutos antes de pedir otro código.");
        }

        codigoOtpRepository.invalidarOtpsAnteriores(usuario, tipoNombre);

        String codigoPlano = String.format("%06d", random.nextInt(1_000_000));
        String codigoHash  = passwordEncoder.encode(codigoPlano);

        CodigoOtp otp = new CodigoOtp();
        otp.setUsuario(usuario);
        otp.setTipoOtp(tipo);
        otp.setCodigoHash(codigoHash);
        otp.setExpiresAt(LocalDateTime.now().plusSeconds(tipo.getTiempoExpiracionSeg()));
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
                .orElseThrow(() -> new RuntimeException("No hay un código activo. Solicitá uno nuevo."));

        if (otp.isExpired()) {
            codigoOtpRepository.invalidar(otp.getIdOtpCode());
            throw new RuntimeException("El código ha expirado. Solicitá uno nuevo.");
        }

        codigoOtpRepository.incrementarAttempts(otp.getIdOtpCode());
        int intentosUsados = otp.getAttempts() + 1;

        if (!passwordEncoder.matches(codigoPlano, otp.getCodigoHash())) {
            int restantes = Constants.OTP_MAX_INTENTOS - intentosUsados;
            if (intentosUsados >= Constants.OTP_MAX_INTENTOS) {
                codigoOtpRepository.invalidar(otp.getIdOtpCode());
                throw new RuntimeException("Demasiados intentos fallidos. Solicitá un código nuevo.");
            }
            throw new RuntimeException("Código incorrecto. " + restantes + " intento(s) restante(s).");
        }

        return otp;
    }

    /**
     * Marca el OTP como usado (consumed). Llamar después de verificarOtp exitoso.
     */
    @Transactional
    public void marcarUsado(CodigoOtp otp) {
        otp.setUsedAt(LocalDateTime.now());
        otp.setActiveFlag(false);
        codigoOtpRepository.save(otp);
    }

    private void enviarEmail(String destinatario, String nombre, String codigo, int expiracionSeg) {
        int minutos = expiracionSeg / 60;
        String html = """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:48px 0;">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0"
                    style="background:#18181f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#4f46e5 0%%,#7c3aed 100%%);padding:32px;text-align:center;">
                        <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:3px;">HC</span>
                        <span style="font-size:16px;font-weight:700;color:rgba(255,255,255,0.9);margin-left:10px;letter-spacing:5px;">HOTCLICK</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px 36px;">
                        <h2 style="margin:0 0 12px;color:#e8e8ed;font-size:22px;font-weight:700;">
                          Hola, %s
                        </h2>
                        <p style="color:#8e8e9a;margin:0 0 28px;font-size:15px;line-height:1.6;">
                          Usá el siguiente código para continuar. Expira en <strong style="color:#e8e8ed;">%d minutos</strong>.
                        </p>
                        <div style="text-align:center;margin:28px 0;">
                          <div style="display:inline-block;background:#111114;border:2px solid rgba(79,70,229,0.4);
                                      border-radius:12px;padding:20px 40px;">
                            <span style="font-size:42px;font-weight:900;color:#fff;letter-spacing:14px;
                                         font-family:'Courier New',monospace;">%s</span>
                          </div>
                        </div>
                        <p style="color:#5e5e6e;font-size:13px;margin:20px 0 0;text-align:center;line-height:1.5;">
                          Si no solicitaste este código, ignorá este correo.<br>
                          Nunca compartas este código con nadie.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#111114;padding:20px 36px;text-align:center;
                                 border-top:1px solid rgba(255,255,255,0.06);">
                        <p style="margin:0;color:#3a3a4a;font-size:12px;">
                          © 2026 HOTCLICK — Todos los derechos reservados
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, minutos, codigo);

        resendEmailService.send(destinatario, "HOTCLICK — Tu código de verificación", html);
    }
}
