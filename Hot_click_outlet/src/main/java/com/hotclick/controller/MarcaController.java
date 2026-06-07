package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Marca;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    private static final Logger log = LoggerFactory.getLogger(MarcaController.class);

    @Autowired private MarcaRepository        marcaRepository;
    @Autowired private UsuarioRepository      usuarioRepository;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private CompanyScope           companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Autowired private InputSanitizer         sanitizer;

    /** Endpoint público — solo marcas de negocios aprobados y visibles */
    @Cacheable("marcas-publicas")
    @GetMapping("/publicas")
    public ResponseEntity<ResponseDTO> listarPublicas() {
        try {
            var marcas = marcaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);
            return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcas));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al obtener marcas: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            var marcas = empresaId != null
                ? marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)
                : marcaRepository.findByEstado(Constants.ESTADO_ACTIVO);
            return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcas));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al obtener marcas: " + e.getMessage()));
        }
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
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
            var empresa = companyScope.getCurrentEmpresaId() != null
                ? empresaRepository.findById(companyScope.getCurrentEmpresaId()).orElse(null) : null;
            Long empresaId = empresa != null ? empresa.getId() : null;

            boolean duplicado = empresaId != null
                ? marcaRepository.existsByNombreMarcaAndEmpresaIdAndEstado(nombre.trim(), empresaId, Constants.ESTADO_ACTIVO)
                : marcaRepository.existsByNombreMarcaAndEstado(nombre.trim(), Constants.ESTADO_ACTIVO);
            if (duplicado)
                return ResponseEntity.badRequest().body(ResponseDTO.error("Ya existe una marca activa con ese nombre"));

            Marca m = new Marca();
            m.setNombreMarca(sanitizer.cleanWithLimit(nombre, 150));
            m.setLogoUrl(body.get("logoUrl") != null ? sanitizer.cleanWithLimit(body.get("logoUrl"), 500) : null);
            m.setAdminCliente(admin);
            m.setEmpresa(empresa);
            m.setEstado(Constants.ESTADO_ACTIVO);
            return ResponseEntity.ok(ResponseDTO.success("Marca creada", marcaRepository.save(m)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Marca m = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
            companyScope.assertCanAccessNullable(m.getEmpresaId());
            if (body.containsKey("nombreMarca") && !body.get("nombreMarca").isBlank()) {
                String nuevoNombre = sanitizer.cleanWithLimit(body.get("nombreMarca"), 150);
                Long empresaId = m.getEmpresaId();
                boolean duplicado = empresaId != null
                    ? marcaRepository.existsByNombreMarcaAndEmpresaIdAndEstadoAndIdNot(nuevoNombre, empresaId, Constants.ESTADO_ACTIVO, id)
                    : marcaRepository.existsByNombreMarcaAndEstadoAndIdNot(nuevoNombre, Constants.ESTADO_ACTIVO, id);
                if (duplicado)
                    return ResponseEntity.badRequest().body(ResponseDTO.error("Ya existe una marca activa con ese nombre"));
                m.setNombreMarca(nuevoNombre);
            }
            if (body.containsKey("logoUrl"))
                m.setLogoUrl(body.get("logoUrl") != null ? sanitizer.cleanWithLimit(body.get("logoUrl"), 500) : null);
            return ResponseEntity.ok(ResponseDTO.success("Marca actualizada", marcaRepository.save(m)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(
            @RequestBody List<Map<String, String>> items,
            @AuthenticationPrincipal UserDetails userDetails) {
        var admin = usuarioRepository.findByCorreo(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("Admin no encontrado"));
        var empresa = companyScope.getCurrentEmpresaId() != null
                ? empresaRepository.findById(companyScope.getCurrentEmpresaId()).orElse(null) : null;
        Long empresaId = empresa != null ? empresa.getId() : null;
        int ok = 0; int duplicates = 0;
        for (Map<String, String> item : items) {
            String nombre = item.get("nombreMarca");
            if (nombre == null || nombre.isBlank()) continue;
            boolean dup = empresaId != null
                ? marcaRepository.existsByNombreMarcaAndEmpresaIdAndEstado(nombre.trim(), empresaId, Constants.ESTADO_ACTIVO)
                : marcaRepository.existsByNombreMarcaAndEstado(nombre.trim(), Constants.ESTADO_ACTIVO);
            if (dup) { duplicates++; continue; }
            Marca m = new Marca();
            m.setNombreMarca(sanitizer.cleanWithLimit(nombre, 150));
            m.setLogoUrl(item.get("logoUrl") != null ? sanitizer.cleanWithLimit(item.get("logoUrl"), 500) : null);
            m.setAdminCliente(admin);
            m.setEmpresa(empresa);
            m.setEstado(Constants.ESTADO_ACTIVO);
            marcaRepository.save(m);
            ok++;
        }
        String msg = "Importadas: " + ok + " marcas" + (duplicates > 0 ? ", omitidas (ya existían): " + duplicates : "");
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("ok", ok, "duplicates", duplicates)));
    }

    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            String url = supabaseStorageService.subirImagen(file, "Marcas");
            return ResponseEntity.ok(ResponseDTO.success("Logo subido", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[marcas/logo] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir logo: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Marca m = marcaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Marca no encontrada"));
            companyScope.assertCanAccessNullable(m.getEmpresaId());
            m.setEstado(Constants.ESTADO_INACTIVO);
            marcaRepository.save(m);
            return ResponseEntity.ok(ResponseDTO.success("Marca eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
