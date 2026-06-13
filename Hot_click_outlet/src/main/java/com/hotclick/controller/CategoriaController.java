package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Categoria;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private UsuarioRepository   usuarioRepository;
    @Autowired private CompanyScope        companyScope;
    @Autowired private InputSanitizer      sanitizer;

    // Sin @Cacheable: el resultado varía según el usuario autenticado (empresa) vs público.
    // Cachear con clave única causaría que un usuario contamine el caché del otro.
    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var cats = empresaId != null
            ? categoriaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)
            : categoriaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Categorías", cats));
    }

    @Cacheable(value = "categorias-publicas", key = "'public'")
    @GetMapping("/publicas")
    public ResponseEntity<ResponseDTO> listarPublicas() {
        var cats = categoriaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Categorías", cats));
    }

    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE')")
    @CacheEvict(value = {"categorias", "categorias-publicas"}, allEntries = true)
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {
        try {
            if (body.get("nombreCategoria") == null || body.get("nombreCategoria").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es obligatorio"));

            Long eid = companyScope.getCurrentEmpresaIdOrOwn();
            var empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
            Categoria cat = new Categoria();
            cat.setNombreCategoria(sanitizer.cleanWithLimit(body.get("nombreCategoria"), 150));
            cat.setDescripcion(sanitizer.cleanWithLimit(body.getOrDefault("descripcion", ""), 500));
            if (body.get("icono") != null) cat.setIcono(sanitizer.cleanWithLimit(body.get("icono"), 20));
            cat.setEstado(Constants.ESTADO_ACTIVO);
            cat.setEmpresa(empresa);
            cat.setAdminCliente(
                usuarioRepository.findByCorreo(ud.getUsername())
                    .orElseThrow(() -> new RuntimeException("Admin no encontrado"))
            );
            String padreIdStr = body.get("padreId");
            if (padreIdStr != null && !padreIdStr.isBlank()) {
                categoriaRepository.findById(Long.parseLong(padreIdStr))
                    .ifPresent(cat::setCategoriaPadre);
            }
            return ResponseEntity.ok(ResponseDTO.success("Categoría creada", categoriaRepository.save(cat)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE')")
    @Transactional
    @CacheEvict(value = {"categorias", "categorias-publicas"}, allEntries = true)
    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(
            @RequestBody List<Map<String, String>> items,
            @AuthenticationPrincipal UserDetails ud) {
        var admin = usuarioRepository.findByCorreo(ud.getUsername())
            .orElseThrow(() -> new RuntimeException("Admin no encontrado"));
        Long eid2 = companyScope.getCurrentEmpresaIdOrOwn();
        var empresa = eid2 != null ? empresaRepository.findById(eid2).orElse(null) : null;
        List<Categoria> batch = new ArrayList<>();
        for (Map<String, String> item : items) {
            String nombre = item.get("nombreCategoria");
            if (nombre == null || nombre.isBlank()) continue;
            Categoria cat = new Categoria();
            cat.setNombreCategoria(sanitizer.cleanWithLimit(nombre, 150));
            cat.setDescripcion(sanitizer.cleanWithLimit(item.getOrDefault("descripcion", ""), 500));
            cat.setEstado(Constants.ESTADO_ACTIVO);
            cat.setEmpresa(empresa);
            cat.setAdminCliente(admin);
            batch.add(cat);
        }
        categoriaRepository.saveAll(batch);
        return ResponseEntity.ok(ResponseDTO.success("Importadas: " + batch.size() + " categorías", Map.of("ok", batch.size())));
    }

    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE')")
    @CacheEvict(value = {"categorias", "categorias-publicas"}, allEntries = true)
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Categoria cat = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            companyScope.assertCanAccessNullable(cat.getEmpresaId());
            if (body.get("nombreCategoria") != null && !body.get("nombreCategoria").isBlank())
                cat.setNombreCategoria(sanitizer.cleanWithLimit(body.get("nombreCategoria"), 150));
            if (body.get("descripcion") != null)
                cat.setDescripcion(sanitizer.cleanWithLimit(body.get("descripcion"), 500));
            if (body.containsKey("icono"))
                cat.setIcono(body.get("icono") != null ? sanitizer.cleanWithLimit(body.get("icono"), 20) : null);
            if (body.containsKey("padreId")) {
                String padreIdStr = body.get("padreId");
                if (padreIdStr == null || padreIdStr.isBlank()) {
                    cat.setCategoriaPadre(null);
                } else {
                    Categoria padre = categoriaRepository.findById(Long.parseLong(padreIdStr))
                        .orElseThrow(() -> new RuntimeException("Categoría padre no encontrada"));
                    // Tenant isolation: padre y hijo deben pertenecer a la misma empresa
                    if (padre.getEmpresaId() != null && !padre.getEmpresaId().equals(cat.getEmpresaId())) {
                        throw new SecurityException("La categoría padre pertenece a otra empresa");
                    }
                    cat.setCategoriaPadre(padre);
                }
            }
            return ResponseEntity.ok(ResponseDTO.success("Categoría actualizada", categoriaRepository.save(cat)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE')")
    @CacheEvict(value = {"categorias", "categorias-publicas"}, allEntries = true)
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Categoria cat = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
            companyScope.assertCanAccessNullable(cat.getEmpresaId());
            cat.setEstado(Constants.ESTADO_INACTIVO);
            categoriaRepository.save(cat);
            return ResponseEntity.ok(ResponseDTO.success("Categoría eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
