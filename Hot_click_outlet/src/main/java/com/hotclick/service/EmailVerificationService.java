package com.hotclick.service;

import com.hotclick.model.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailVerificationService {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private static class PendingRegistration {
        final Usuario usuario;
        final String codigo;
        final LocalDateTime expiry;

        PendingRegistration(Usuario usuario, String codigo) {
            this.usuario = usuario;
            this.codigo  = codigo;
            this.expiry  = LocalDateTime.now().plusMinutes(10);
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    private final ConcurrentHashMap<String, PendingRegistration> pending = new ConcurrentHashMap<>();

    public void iniciarRegistro(Usuario usuario) throws Exception {
        String codigo = String.format("%06d", new Random().nextInt(1_000_000));
        pending.put(usuario.getCorreo().toLowerCase(), new PendingRegistration(usuario, codigo));
        enviarEmail(usuario.getCorreo(), usuario.getNombre(), codigo);
    }

    public Usuario verificarYRegistrar(String correo, String codigo) {
        PendingRegistration reg = pending.get(correo.toLowerCase());
        if (reg == null || reg.isExpired()) {
            throw new RuntimeException("El código ha expirado. Vuelve a registrarte");
        }
        if (!reg.codigo.equals(codigo)) {
            throw new RuntimeException("Código de verificación incorrecto");
        }
        Usuario creado = usuarioService.registrarUsuario(reg.usuario);
        pending.remove(correo.toLowerCase());
        return creado;
    }

    private void enviarEmail(String destinatario, String nombre, String codigo) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(destinatario);
        helper.setSubject("HOTCLICK — Verifica tu cuenta");

        String html = """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                <tr><td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);">
                    <tr>
                      <td style="background:#111;padding:28px;text-align:center;">
                        <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:2px;">HC</span>
                        <span style="font-size:18px;font-weight:700;color:#fff;margin-left:8px;letter-spacing:4px;">HOTCLICK</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px 32px;">
                        <h2 style="margin:0 0 16px;color:#111;font-size:22px;">¡Bienvenido/a %s!</h2>
                        <p style="color:#555;margin:0 0 24px;">Gracias por registrarte en HOTCLICK. Para activar tu cuenta, usa el código de verificación:</p>
                        <div style="text-align:center;margin:24px 0;">
                          <span style="display:inline-block;background:#111;color:#fff;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 32px;border-radius:8px;">%s</span>
                        </div>
                        <p style="color:#888;font-size:13px;margin:24px 0 0;">Este código expira en <strong>10 minutos</strong>. Si no creaste esta cuenta, ignora este correo.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
                        <p style="margin:0;color:#aaa;font-size:12px;">© 2026 HOTCLICK — Todos los derechos reservados</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, codigo);

        helper.setText(html, true);
        mailSender.send(message);
    }
}
