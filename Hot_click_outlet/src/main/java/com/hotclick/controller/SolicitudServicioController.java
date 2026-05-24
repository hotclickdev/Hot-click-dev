package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.SolicitudServicio;
import com.hotclick.repository.SolicitudServicioRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.ImageModerationService;
import com.hotclick.service.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servicios")
public class SolicitudServicioController {

    @Autowired private SolicitudServicioRepository solicitudRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ImageModerationService moderationService;

    /** Subir foto para una solicitud — devuelve la URL pública */
    @PostMapping("/fotos")
    public ResponseEntity<ResponseDTO> subirFoto(@RequestParam("file") MultipartFile file) {
        try {
            var mod = moderationService.moderar(file);
            if (!mod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
            String url = supabaseStorageService.subirImagen(file, "servicios");
            return ResponseEntity.ok(ResponseDTO.success("Foto subida", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error al subir foto: " + e.getMessage()));
        }
    }

    /** Crear solicitud — requiere token JWT */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String descripcion = body.get("descripcion");
            if (descripcion == null || descripcion.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La descripción es requerida"));

            SolicitudServicio s = new SolicitudServicio();

            if (userDetails != null) {
                usuarioRepo.findByCorreo(userDetails.getUsername()).ifPresent(s::setUsuario);
            }

            s.setDescripcion(descripcion.trim());
            s.setPresupuesto(body.getOrDefault("presupuesto", null));
            s.setFotosUrls(body.getOrDefault("fotosUrls", null));
            s.setNombreContacto(body.getOrDefault("nombreContacto", null));
            s.setTelefonoContacto(body.getOrDefault("telefonoContacto", null));

            SolicitudServicio guardada = solicitudRepo.save(s);
            return ResponseEntity.ok(ResponseDTO.success("Solicitud enviada con éxito", guardada));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    /** Mis solicitudes — requiere token JWT */
    @GetMapping("/mis-solicitudes")
    public ResponseEntity<ResponseDTO> misSolicitudes(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            var usuario = usuarioRepo.findByCorreo(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            List<SolicitudServicio> lista = solicitudRepo.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId());
            return ResponseEntity.ok(ResponseDTO.success("Solicitudes obtenidas", lista));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    /** Listar todas — admin */
    @GetMapping
    public ResponseEntity<ResponseDTO> listarTodas() {
        List<SolicitudServicio> lista = solicitudRepo.findAllByOrderByFechaCreacionDesc();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes obtenidas", lista));
    }

    /** Cambiar estado — admin */
    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            SolicitudServicio s = solicitudRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
            String nuevoEstado = body.get("estado");
            if (nuevoEstado == null || nuevoEstado.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Estado requerido"));
            s.setEstado(nuevoEstado.toUpperCase());
            if (body.containsKey("notasAdmin")) s.setNotasAdmin(body.get("notasAdmin"));
            solicitudRepo.save(s);
            return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", s));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    /** Eliminar solicitud — admin */
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            solicitudRepo.deleteById(id);
            return ResponseEntity.ok(ResponseDTO.success("Solicitud eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }
}
