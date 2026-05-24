package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ImageModerationService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TestimonioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/testimonios")
public class TestimonioController {

    @Autowired private TestimonioService testimonioService;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ImageModerationService moderationService;

    /** Público — devuelve solo testimonios APROBADO */
    @GetMapping("/publicos")
    public ResponseEntity<ResponseDTO> listarPublicos() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarAprobadosPublico()));
    }

    /** Admin — devuelve todos con correo y estado */
    @GetMapping("/admin")
    public ResponseEntity<ResponseDTO> listarAdmin() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarTodosAdmin()));
    }

    /** Sube foto del testimonio — requiere auth, pasa por moderación */
    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            var mod = moderationService.moderar(file);
            if (!mod.safe())
                return ResponseEntity.badRequest()
                    .body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
            String url = supabaseStorageService.subirImagen(file, "testimonios");
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Crear testimonio — requiere auth, queda en estado PENDIENTE */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String comentario = body.get("comentario");
            if (comentario == null || comentario.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario es requerido"));
            if (comentario.length() > 500)
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario no puede superar 500 caracteres"));

            var t = testimonioService.crear(userDetails.getUsername(), comentario, body.get("imagenUrl"));
            return ResponseEntity.ok(ResponseDTO.success("Testimonio enviado, pendiente de aprobación", t));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Aprobado", testimonioService.aprobar(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Rechazado", testimonioService.rechazar(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
