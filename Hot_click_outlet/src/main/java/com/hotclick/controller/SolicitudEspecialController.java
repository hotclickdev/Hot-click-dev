package com.hotclick.controller;

import com.hotclick.service.ResendEmailService;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;

/**
 * Recibe solicitudes de productos que no están en el catálogo.
 * Guarda en hot_click_solicitud_especial_tb y notifica al admin por email.
 */
@RestController
@RequestMapping("/api/public/solicitud-especial")
public class SolicitudEspecialController {

    private static final Logger log = LoggerFactory.getLogger(SolicitudEspecialController.class);
    private static final String ADMIN_EMAIL = "hotclick.cr@gmail.com";
    private static final int MAX_NOMBRE = 100;
    private static final int MAX_CORREO = 150;
    private static final int MAX_DESCRIPCION = 1000;

    private final JdbcTemplate jdbc;
    private final ResendEmailService emailService;
    private final InputSanitizer sanitizer;

    public SolicitudEspecialController(JdbcTemplate jdbc, ResendEmailService emailService,
                                       InputSanitizer sanitizer) {
        this.jdbc = jdbc;
        this.emailService = emailService;
        this.sanitizer = sanitizer;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(
            @RequestParam String nombre,
            @RequestParam String whatsapp,
            @RequestParam(required = false) String correo,
            @RequestParam(required = false) String descripcion,
            @RequestParam(required = false) MultipartFile imagen,
            @RequestParam(required = false) String empresaSlug) {

        String nombreLimpio = sanitizer.cleanWithLimit(nombre, MAX_NOMBRE);
        if (nombreLimpio == null || nombreLimpio.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre es requerido"));
        }
        if (whatsapp == null || !whatsapp.matches("[2-9]\\d{7}")) {
            return ResponseEntity.badRequest().body(Map.of("error", "WhatsApp inválido"));
        }
        String correoLimpio = correo == null ? null : sanitizer.cleanWithLimit(correo, MAX_CORREO);
        String descLimpia = descripcion == null ? null : sanitizer.cleanWithLimit(descripcion, MAX_DESCRIPCION);

        Long id = jdbc.queryForObject("""
            INSERT INTO hot_click_solicitud_especial_tb
                (nombre, whatsapp, correo, descripcion, estado)
            VALUES (?, ?, ?, ?, 'PENDIENTE')
            RETURNING id
            """,
            Long.class,
            nombreLimpio,
            whatsapp.trim(),
            correoLimpio,
            descLimpia
        );

        try {
            enviarNotificacionAdmin(id, nombreLimpio, whatsapp, correoLimpio, descLimpia);
        } catch (Exception e) {
            log.warn("[solicitud-especial] Email de notificación falló para id={}: {}", id, e.getMessage());
        }

        log.info("[solicitud-especial] Nueva solicitud id={} wa={}", id, whatsapp);

        return ResponseEntity.ok(Map.of(
            "id",      id,
            "mensaje", "Solicitud recibida. El equipo de HOTCLICK te contacta pronto por WhatsApp."
        ));
    }

    private void enviarNotificacionAdmin(Long id, String nombre, String whatsapp,
                                          String correo, String descripcion) {
        String waLink = "https://wa.me/506" + whatsapp;
        String html = """
            <div style="font-family:sans-serif;max-width:520px">
              <h2 style="color:#1747A8">Nueva solicitud especial #%d</h2>
              <table style="border-collapse:collapse;width:100%%">
                <tr><td style="padding:6px 12px;font-weight:bold">Nombre</td><td style="padding:6px 12px">%s</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:6px 12px;font-weight:bold">WhatsApp</td>
                  <td style="padding:6px 12px"><a href="%s">+506 %s</a></td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Correo</td><td style="padding:6px 12px">%s</td></tr>
                <tr style="background:#f5f5f5"><td style="padding:6px 12px;font-weight:bold">Descripción</td>
                  <td style="padding:6px 12px">%s</td></tr>
              </table>
            </div>
            """.formatted(
                id,
                HtmlUtils.htmlEscape(nombre),
                HtmlUtils.htmlEscape(waLink),
                HtmlUtils.htmlEscape(whatsapp),
                HtmlUtils.htmlEscape(correo != null ? correo : "—"),
                HtmlUtils.htmlEscape(descripcion != null ? descripcion : "—")
            );

        emailService.send(ADMIN_EMAIL, "Solicitud especial #" + id + " — " + nombre, html);
    }
}
