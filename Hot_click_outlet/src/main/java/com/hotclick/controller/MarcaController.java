package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Marca;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private SupabaseStorageService supabaseStorageService;

    /** Endpoint público — sin autenticación, usado por el catálogo y búsqueda */
    @GetMapping("/publicas")
    public ResponseEntity<ResponseDTO> listarPublicas() {
        var marcas = marcaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcas));
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        var marcas = marcaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcas));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String nombre = body.get("nombreMarca");
            if (nombre == null || nombre.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre de la marca es requerido"));

            var admin = usuarioRepository.findByCorreo(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            if (marcaRepository.existsByNombreMarcaAndEstado(nombre.trim(), Constants.ESTADO_ACTIVO))
                return ResponseEntity.badRequest().body(ResponseDTO.error("Ya existe una marca activa con ese nombre"));

            Marca m = new Marca();
            m.setNombreMarca(nombre.trim());
            m.setLogoUrl(body.get("logoUrl"));
            m.setAdminCliente(admin);
            m.setEstado(Constants.ESTADO_ACTIVO);
            return ResponseEntity.ok(ResponseDTO.success("Marca creada", marcaRepository.save(m)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Marca m = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
            if (body.containsKey("nombreMarca") && !body.get("nombreMarca").isBlank())
                m.setNombreMarca(body.get("nombreMarca").trim());
            if (body.containsKey("logoUrl"))
                m.setLogoUrl(body.get("logoUrl"));
            return ResponseEntity.ok(ResponseDTO.success("Marca actualizada", marcaRepository.save(m)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        try {
            String url = supabaseStorageService.subirImagen(file, "marcas");
            return ResponseEntity.ok(ResponseDTO.success("Logo subido", Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Marca m = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
            m.setEstado(Constants.ESTADO_INACTIVO);
            marcaRepository.save(m);
            return ResponseEntity.ok(ResponseDTO.success("Marca eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
