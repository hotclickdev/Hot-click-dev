package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private static class ResetEntry {
        final String codigo;
        final LocalDateTime expiry;
        boolean verificado;

        ResetEntry(String codigo) {
            this.codigo = codigo;
            this.expiry = LocalDateTime.now().plusMinutes(10);
            this.verificado = false;
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    private final ConcurrentHashMap<String, ResetEntry> tokens = new ConcurrentHashMap<>();

    public void enviarCodigo(String correo) throws Exception {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(correo);
        if (usuarioOpt.isEmpty()) {
            // No revelar si el correo existe por seguridad
            return;
        }

        String codigo = String.format("%06d", new Random().nextInt(1_000_000));
        tokens.put(correo.toLowerCase(), new ResetEntry(codigo));

        Usuario usuario = usuarioOpt.get();
        enviarEmail(correo, usuario.getNombre(), codigo);
    }

    public boolean verificarCodigo(String correo, String codigo) {
        ResetEntry entry = tokens.get(correo.toLowerCase());
        if (entry == null || entry.isExpired()) return false;
        if (!entry.codigo.equals(codigo)) return false;
        entry.verificado = true;
        return true;
    }

    @Transactional
    public boolean cambiarContrasena(String correo, String nuevaContrasena) {
        ResetEntry entry = tokens.get(correo.toLowerCase());
        if (entry == null || !entry.verificado || entry.isExpired()) return false;

        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(correo);
        if (usuarioOpt.isEmpty()) return false;

        Usuario usuario = usuarioOpt.get();
        usuario.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
        tokens.remove(correo.toLowerCase());
        return true;
    }

    private void enviarEmail(String destinatario, String nombre, String codigo) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(destinatario);
        helper.setSubject("HOTCLICK — Código de recuperación de contraseña");

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
                        <h2 style="margin:0 0 16px;color:#111;font-size:22px;">Recuperación de contraseña</h2>
                        <p style="color:#555;margin:0 0 24px;">Hola <strong>%s</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
                        <p style="color:#555;margin:0 0 16px;">Tu código de verificación es:</p>
                        <div style="text-align:center;margin:24px 0;">
                          <span style="display:inline-block;background:#111;color:#fff;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 32px;border-radius:8px;">%s</span>
                        </div>
                        <p style="color:#888;font-size:13px;margin:24px 0 0;">Este código expira en <strong>10 minutos</strong>. Si no solicitaste este cambio, ignora este correo.</p>
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
