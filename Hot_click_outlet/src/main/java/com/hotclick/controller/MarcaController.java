package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Marca;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.MarcaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/marcas")
public class MarcaController {

    private static final Logger log = LoggerFactory.getLogger(MarcaController.class);

    @Autowired private CompanyScope companyScope;
    @Autowired private MarcaService marcaService;

    @GetMapping("/publicas")
    public ResponseEntity<ResponseDTO> listarPublicas() {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcaService.listarPublicas()));
        } catch (Exception e) {
            log.error("[marcas/publicas] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al obtener marcas: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas",
                marcaService.listar(companyScope.getCurrentEmpresaId())));
        } catch (Exception e) {
            log.error("[marcas] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al obtener marcas: " + e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')") // P4-01
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String nombre = body.get("nombreMarca");
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre de la marca es requerido"));
        }
        Long empresaId = companyScope.requireEmpresaIdOrAdmin(); // P4-01: fuera del try → 403
        try {
            return ResponseEntity.ok(ResponseDTO.success("Marca creada", marcaService.crear(
                nombre, body.get("logoUrl"), userDetails.getUsername(),
                empresaId, companyScope.isAdminIT())));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')") // P4-01
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Marca m = marcaService.buscar(id);
            companyScope.assertCanAccessNullable(m.getEmpresaId());
            return ResponseEntity.ok(ResponseDTO.success("Marca actualizada", marcaService.actualizar(m, body)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')") // P4-01
    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(
            @RequestBody List<Map<String, String>> items,
            @AuthenticationPrincipal UserDetails userDetails) {
        Map<String, Integer> r = marcaService.importarBulk(
            items, userDetails.getUsername(),
            companyScope.requireEmpresaIdOrAdmin(), companyScope.isAdminIT());
        String msg = "Importadas: " + r.get("ok") + " marcas"
            + (r.get("duplicates") > 0 ? ", omitidas (ya existían): " + r.get("duplicates") : "");
        return ResponseEntity.ok(ResponseDTO.success(msg, r));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')") // P4-01
    @PostMapping("/logo")
    public ResponseEntity<ResponseDTO> subirLogo(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        }
        companyScope.requireEmpresaIdOrAdmin(); // P4-01: comprador o vendedor sin negocio no sube
        try {
            String url = marcaService.subirLogo(file);
            return ResponseEntity.ok(ResponseDTO.success("Logo subido", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[marcas/logo] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir logo"));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')") // P4-01
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Marca m = marcaService.buscar(id);
            companyScope.assertCanAccessNullable(m.getEmpresaId());
            marcaService.eliminar(m);
            return ResponseEntity.ok(ResponseDTO.success("Marca eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }
}
