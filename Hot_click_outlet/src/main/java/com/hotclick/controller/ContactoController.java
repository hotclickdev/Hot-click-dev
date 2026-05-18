package com.hotclick.controller;

import com.hotclick.service.ResendEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ContactoController {

    @Autowired private ResendEmailService resendEmailService;

    @Value("${sendgrid.from-email}")
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
            String html = "<div style='font-family:sans-serif;max-width:560px'>"
                + "<h2 style='color:#4f7cff'>Nuevo mensaje de contacto</h2>"
                + "<table style='width:100%;border-collapse:collapse'>"
                + "<tr><td style='padding:8px;font-weight:bold;color:#555'>Nombre</td>"
                + "<td style='padding:8px'>" + esc(nombre) + "</td></tr>"
                + "<tr style='background:#f5f5f7'><td style='padding:8px;font-weight:bold;color:#555'>Correo</td>"
                + "<td style='padding:8px'><a href='mailto:" + esc(correo) + "'>" + esc(correo) + "</a></td></tr>"
                + "</table>"
                + "<div style='margin-top:16px;padding:16px;background:#f5f5f7;border-radius:8px'>"
                + "<strong style='color:#555'>Mensaje:</strong><br/><br/>"
                + esc(mensaje).replace("\n", "<br/>")
                + "</div>"
                + "<p style='margin-top:16px;font-size:12px;color:#999'>Enviado desde el formulario de contacto de HOTCLICK</p>"
                + "</div>";

            resendEmailService.send(fromEmail, "Nuevo mensaje de contacto — " + nombre, html);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "No se pudo enviar el mensaje"));
        }
    }

    private String esc(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
