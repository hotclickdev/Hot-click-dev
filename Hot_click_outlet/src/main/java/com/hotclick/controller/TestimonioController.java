package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ImageModerationService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TestimonioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(TestimonioController.class);

    @Autowired private TestimonioService testimonioService;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ImageModerationService moderationService;

    /** Público — devuelve solo APROBADO */
    @GetMapping("/publicos")
    public ResponseEntity<ResponseDTO> listarPublicos() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarAprobadosPublico()));
    }

    /** Admin — devuelve todos */
    @GetMapping("/admin")
    public ResponseEntity<ResponseDTO> listarAdmin() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarTodosAdmin()));
    }

    /** Usuario autenticado — sus propios testimonios (para saber qué productos ya reseñó) */
    @GetMapping("/mis-testimonios")
    public ResponseEntity<ResponseDTO> misTestimonios(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDTO.success("Mis testimonios",
            testimonioService.listarPorUsuario(userDetails.getUsername())));
    }

    /** Usuario autenticado — productos que puede reseñar (comprados, con flag yaReseno) */
    @GetMapping("/productos-para-resenar")
    public ResponseEntity<ResponseDTO> productosParaResenar(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDTO.success("Productos para reseñar",
            testimonioService.productosParaResenar(userDetails.getUsername())));
    }

    /** Sube foto del testimonio — requiere auth, pasa por moderación de contenido */
    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            var mod = moderationService.moderar(file);
            if (!mod.safe())
                return ResponseEntity.badRequest()
                    .body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
            String url = supabaseStorageService.subirImagen(file, "testimonios");
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[testimonios/imagen] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir imagen: " + e.getMessage()));
        }
    }

    /**
     * Crear testimonio — requiere auth.
     * Body: { comentario, imagenUrl (opcional), productoId }
     * Valida que el usuario haya comprado el producto y que no tenga uno previo.
     */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String comentario = (String) body.get("comentario");
            if (comentario == null || comentario.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario es requerido"));
            if (comentario.length() > 500)
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario no puede superar 500 caracteres"));

            Object pidObj = body.get("productoId");
            Long productoId = pidObj instanceof Number n ? n.longValue() : null;

            String imagenUrl = (String) body.get("imagenUrl");

            var t = testimonioService.crear(userDetails.getUsername(), comentario, imagenUrl, productoId);
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
