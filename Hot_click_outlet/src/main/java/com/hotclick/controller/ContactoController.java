package com.hotclick.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ContactoController {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @PostMapping("/contacto")
    public ResponseEntity<?> enviarMensaje(@RequestBody Map<String, String> body) {
        String nombre  = body.getOrDefault("nombre", "").trim();
        String correo  = body.getOrDefault("correo", "").trim();
        String mensaje = body.getOrDefault("mensaje", "").trim();

        if (nombre.isEmpty() || correo.isEmpty() || mensaje.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Campos requeridos incompletos"));
        }

        try {
            MimeMessage mail = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mail, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(fromEmail);
            helper.setReplyTo(correo);
            helper.setSubject("📩 Nuevo mensaje de contacto – " + nombre);
            helper.setText(
                "<div style='font-family:sans-serif;max-width:560px'>"
                + "<h2 style='color:#4f7cff'>Nuevo mensaje de contacto</h2>"
                + "<table style='width:100%;border-collapse:collapse'>"
                + "<tr><td style='padding:8px;font-weight:bold;color:#555'>Nombre</td>"
                + "<td style='padding:8px'>" + escapeHtml(nombre) + "</td></tr>"
                + "<tr style='background:#f5f5f7'><td style='padding:8px;font-weight:bold;color:#555'>Correo</td>"
                + "<td style='padding:8px'><a href='mailto:" + escapeHtml(correo) + "'>" + escapeHtml(correo) + "</a></td></tr>"
                + "</table>"
                + "<div style='margin-top:16px;padding:16px;background:#f5f5f7;border-radius:8px'>"
                + "<strong style='color:#555'>Mensaje:</strong><br/><br/>"
                + escapeHtml(mensaje).replace("\n", "<br/>")
                + "</div>"
                + "<p style='margin-top:16px;font-size:12px;color:#999'>Enviado desde el formulario de contacto de HOTCLICK</p>"
                + "</div>",
                true
            );
            mailSender.send(mail);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "No se pudo enviar el mensaje"));
        }
    }

    private String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
