package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.TicketSoporte;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TicketSoporteRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/soporte/tickets")
public class TicketSoporteController {

    private static final Logger log = LoggerFactory.getLogger(TicketSoporteController.class);

    @Autowired private TicketSoporteRepository ticketRepo;
    @Autowired private EmpresaRepository empresaRepo;
    @Autowired private CompanyScope companyScope;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ResendEmailService emailService;

    @Value("${soporte.tickets.email:hotclick.cr@gmail.com}")
    private String soporteTicketsEmail;

    /** Subir foto para un ticket — devuelve la URL pública */
    @PostMapping("/fotos")
    public ResponseEntity<ResponseDTO> subirFoto(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            String url = supabaseStorageService.subirImagen(file, "Soporte/Tickets");
            return ResponseEntity.ok(ResponseDTO.success("Foto subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[soporte/tickets/fotos] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir foto: " + e.getMessage()));
        }
    }

    /** Crear ticket — requiere token JWT (EMPRENDEDOR/ADMIN por-empresa) */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Map<String, String> body) {
        try {
            String titulo = body.get("titulo");
            String descripcion = body.get("descripcion");
            if (titulo == null || titulo.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El título es requerido"));
            if (descripcion == null || descripcion.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La descripción es requerida"));

            Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
            if (empresaId == null)
                return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo determinar el negocio del usuario"));
            Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
            if (empresa == null)
                return ResponseEntity.badRequest().body(ResponseDTO.error("Negocio no encontrado"));

            Usuario usuario = companyScope.getCurrentUser();

            TicketSoporte t = new TicketSoporte();
            t.setEmpresa(empresa);
            t.setUsuario(usuario);
            t.setTitulo(titulo.trim());
            t.setDescripcion(descripcion.trim());
            t.setFotoUrl(body.getOrDefault("fotoUrl", null));

            TicketSoporte guardado = ticketRepo.save(t);
            notificarPorEmail(guardado, empresa, usuario);

            return ResponseEntity.ok(ResponseDTO.success("Ticket enviado con éxito", guardado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    private void notificarPorEmail(TicketSoporte t, Empresa empresa, Usuario usuario) {
        Thread.ofVirtual().start(() -> {
            try {
                String asunto = "[HOTCLICK SOPORTE] " + t.getTitulo() + " — " + empresa.getNombreEmpresa();
                String html = "<div style='font-family:sans-serif;max-width:600px'>" +
                    "<h2 style='color:#1747A8'>Nuevo ticket de soporte</h2>" +
                    "<table style='border-collapse:collapse;width:100%'>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Negocio</td>" +
                    "<td style='padding:6px 12px'>" + empresa.getNombreEmpresa() + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Usuario</td>" +
                    "<td style='padding:6px 12px'>" + (usuario != null ? usuario.getNombre() + " (" + usuario.getCorreo() + ")" : "—") + "</td></tr>" +
                    "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Título</td>" +
                    "<td style='padding:6px 12px'>" + t.getTitulo() + "</td></tr>" +
                    "<tr style='background:#f9fafb'><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Descripción</td>" +
                    "<td style='padding:6px 12px'>" + t.getDescripcion() + "</td></tr>" +
                    (t.getFotoUrl() != null
                        ? "<tr><td style='padding:6px 12px;font-weight:bold;color:#6b7280'>Foto</td>" +
                          "<td style='padding:6px 12px'><a href='" + t.getFotoUrl() + "'>" + t.getFotoUrl() + "</a></td></tr>"
                        : "") +
                    "</table>" +
                    "</div>";
                emailService.send(soporteTicketsEmail, asunto, html);
            } catch (Exception e) {
                log.warn("[soporte/tickets] No se pudo enviar email de notificación id={}: {}", t.getId(), e.getMessage());
            }
        });
    }
}
