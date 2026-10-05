package com.hotclick.controller;

import com.hotclick.exception.ImagenOcupadaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.SolicitudServicio;
import com.hotclick.repository.SolicitudServicioRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TurnstileFormGuard;
import com.hotclick.service.solicitud.SolicitudServicioEntrada;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(SolicitudServicioController.class);

    @Autowired private SolicitudServicioRepository solicitudRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private TurnstileFormGuard turnstileFormGuard;

    /** Subir foto para una solicitud — devuelve la URL pública */
    /*
     * FULL-01: sin Turnstile a propósito. El formulario sube cada foto al elegirla, en paralelo
     * y antes de que el widget emita su token; el token de Cloudflare es de un solo uso y lo
     * consume el POST final. Con la clave configurada (prod) exigirlo acá rompería las subidas
     * actuales. La protección de este endpoint es el rate-limit por IP y el tope de
     * megapíxeles por header de StorageImageValidator.
     */
    @PostMapping("/fotos")
    public ResponseEntity<ResponseDTO> subirFoto(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            String url = supabaseStorageService.subirImagen(file, "Servicios/Solicitudes");
            return ResponseEntity.ok(ResponseDTO.success("Foto subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (ImagenOcupadaException e) {
            return ResponseEntity.status(503)
                .header("Retry-After", String.valueOf(ImagenOcupadaException.RETRY_AFTER_SEGUNDOS))
                .body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[servicios/fotos] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir foto: " + e.getMessage()));
        }
    }

    /** Crear solicitud — endpoint público (permitAll); el JWT es opcional */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {
        if (!turnstileFormGuard.verificado(body.get("turnstileToken"), httpRequest)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(TurnstileFormGuard.MSG_ANTI_BOT));
        }
        try {
            SolicitudServicioEntrada.Datos datos = SolicitudServicioEntrada.validar(body);
            SolicitudServicio s = new SolicitudServicio();

            if (userDetails != null) {
                usuarioRepo.findByCorreo(userDetails.getUsername()).ifPresent(s::setUsuario);
            }

            s.setDescripcion(datos.descripcion());
            s.setPresupuesto(datos.presupuesto());
            s.setFotosUrls(datos.fotosUrls());
            s.setNombreContacto(datos.nombre());
            s.setTelefonoContacto(datos.telefono());

            SolicitudServicio guardada = solicitudRepo.save(s);
            return ResponseEntity.ok(ResponseDTO.success("Solicitud enviada con éxito", guardada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[servicios] No se pudo crear la solicitud: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo enviar la solicitud"));
        }
    }

    /** Mis solicitudes — requiere token JWT */
    @GetMapping("/mis-solicitudes")
    public ResponseEntity<ResponseDTO> misSolicitudes(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            var usuario = usuarioRepo.findByCorreo(userDetails.getUsername())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
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
                .orElseThrow(() -> new RecursoNoEncontradoException("Solicitud", id));
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
