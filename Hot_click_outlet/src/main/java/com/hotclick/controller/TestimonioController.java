package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ImageModerationService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TestimonioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @Autowired private com.hotclick.service.TextModerationService textModerationService;
    @Autowired private com.hotclick.service.TelegramService telegramService;

    /** Público — testimonios generales aprobados (comentarios de la web) */
    @GetMapping("/publicos")
    public ResponseEntity<ResponseDTO> listarPublicos() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarAprobadosPublico()));
    }

    /** Público — reseñas aprobadas de un producto */
    @GetMapping("/producto/{id}/resenas")
    public ResponseEntity<ResponseDTO> resenasProducto(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Reseñas", testimonioService.listarResenasProducto(id)));
    }

    /** Admin — devuelve todos */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> listarAdmin() {
        return ResponseEntity.ok(ResponseDTO.success("Testimonios", testimonioService.listarTodosAdmin()));
    }

    /** Usuario autenticado — sus propios testimonios y reseñas */
    @GetMapping("/mis-testimonios")
    public ResponseEntity<ResponseDTO> misTestimonios(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDTO.success("Mis testimonios",
            testimonioService.listarPorUsuario(userDetails.getUsername())));
    }

    /** Usuario autenticado — productos que puede reseñar con contador (0-3) */
    @GetMapping("/productos-para-resenar")
    public ResponseEntity<ResponseDTO> productosParaResenar(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDTO.success("Productos para reseñar",
            testimonioService.productosParaResenar(userDetails.getUsername())));
    }

    /** Sube foto — requiere auth, pasa por moderación */
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
     * Crear testimonio general (comentario de la web).
     * Body: { comentario, imagenUrl? }
     */
    @PostMapping("/testimonio")
    public ResponseEntity<ResponseDTO> crearTestimonio(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String comentario = (String) body.get("comentario");
            if (comentario == null || comentario.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario es requerido"));
            if (comentario.length() > 500)
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario no puede superar 500 caracteres"));
            var textMod = textModerationService.moderar(comentario);
            if (!textMod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario contiene contenido no permitido en la plataforma"));

            String imagenUrl = (String) body.get("imagenUrl");
            Object calObj = body.get("calificacion");
            Integer calificacion = calObj instanceof Number n ? n.intValue() : null;

            var t = testimonioService.crearTestimonio(userDetails.getUsername(), comentario, imagenUrl, calificacion);
            telegramService.enviar(String.format(
                "💬 *NUEVO TESTIMONIO*\n\n*Usuario:* %s\n*Comentario:* %s",
                userDetails.getUsername(),
                comentario.length() > 200 ? comentario.substring(0, 200) + "..." : comentario));
            return ResponseEntity.ok(ResponseDTO.success("Testimonio enviado, pendiente de aprobación", t));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Crear reseña de producto.
     * Body: { comentario, productoId, calificacion (1-5), imagenUrl? }
     * Valida compra previa y máximo 3 reseñas por usuario por producto.
     */
    @PostMapping("/resena")
    public ResponseEntity<ResponseDTO> crearResena(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String comentario = (String) body.get("comentario");
            if (comentario == null || comentario.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario es requerido"));
            if (comentario.length() > 500)
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario no puede superar 500 caracteres"));
            var textMod = textModerationService.moderar(comentario);
            if (!textMod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El comentario contiene contenido no permitido en la plataforma"));

            Object pidObj = body.get("productoId");
            Long productoId = pidObj instanceof Number n ? n.longValue() : null;

            Object calObj = body.get("calificacion");
            Integer calificacion = calObj instanceof Number n ? n.intValue() : null;

            String imagenUrl = (String) body.get("imagenUrl");

            var t = testimonioService.crearResena(userDetails.getUsername(), comentario, imagenUrl, productoId, calificacion);
            telegramService.enviar(String.format(
                "⭐ *NUEVA RESEÑA*\n\n*Usuario:* %s\n*Producto ID:* %s\n*Calificación:* %s/5\n*Comentario:* %s",
                userDetails.getUsername(),
                productoId != null ? productoId : "—",
                calificacion != null ? calificacion : "—",
                comentario.length() > 200 ? comentario.substring(0, 200) + "..." : comentario));
            return ResponseEntity.ok(ResponseDTO.success("Reseña enviada, pendiente de aprobación", t));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Público — promedio y conteo de calificaciones aprobadas para un producto */
    @GetMapping("/producto/{id}/rating")
    public ResponseEntity<ResponseDTO> ratingProducto(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Rating", testimonioService.getRatingStats(id)));
    }

    @PutMapping("/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Aprobado", testimonioService.aprobar(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Rechazado", testimonioService.rechazar(id)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
