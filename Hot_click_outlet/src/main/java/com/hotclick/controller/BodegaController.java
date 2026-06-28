package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/bodegas")
public class BodegaController {

    @Autowired private BodegaRepository  bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CompanyScope      companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Autowired private com.hotclick.service.TenantService         tenantService;
    @Autowired private InputSanitizer    sanitizer;

    @Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var bodegas = empresaId != null
            ? bodegaRepository.findByEmpresaIdOrNoEmpresaAndEstado(empresaId, Constants.ESTADO_ACTIVO)
            : bodegaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        var dtos = bodegas.stream().map(b -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", b.getId());
            m.put("nombreBodega", b.getNombreBodega());
            m.put("direccionExacta", b.getDireccionExacta());
            m.put("telefono", b.getTelefono());
            m.put("correoContacto", b.getCorreoContacto());
            m.put("encargadoNombre", b.getEncargadoNombre());
            m.put("estado", b.getEstado());
            if (b.getEmpresa() != null) {
                m.put("empresaId", b.getEmpresa().getId());
                m.put("empresaNombre", b.getEmpresa().getNombreEmpresa());
                m.put("empresaLogoUrl", b.getEmpresa().getLogoUrl());
            }
            return m;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Bodegas", dtos));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {
        // Verificación de límite de plan — propaga PlanLimitException → GlobalExceptionHandler (HTTP 403)
        Long eid = companyScope.getCurrentEmpresaIdOrOwn();
        if (eid != null) tenantService.verificarLimiteBodegas(eid);

        try {
            if (body.get("nombreBodega") == null || body.get("nombreBodega").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es obligatorio"));
            if (body.get("direccionExacta") == null || body.get("direccionExacta").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La dirección es obligatoria"));
            if (body.get("telefono") == null || body.get("telefono").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El teléfono es obligatorio"));
            var empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
            Bodega b = new Bodega();
            b.setNombreBodega(body.get("nombreBodega").trim());
            b.setDireccionExacta(body.get("direccionExacta").trim());
            b.setTelefono(body.get("telefono").trim());
            b.setCorreoContacto(body.getOrDefault("correoContacto", ""));
            b.setEncargadoNombre(body.getOrDefault("encargadoNombre", ""));
            b.setProvincia(sanitizer.normalizeGeo(body.get("provincia")));
            b.setCanton(sanitizer.normalizeGeo(body.get("canton")));
            b.setEstado(Constants.ESTADO_ACTIVO);
            b.setEmpresa(empresa);
            b.setAdminCliente(
                usuarioRepository.findByCorreo(ud.getUsername())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Admin no encontrado"))
            );
            return ResponseEntity.ok(ResponseDTO.success("Bodega creada", bodegaRepository.save(b)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(
            @RequestBody List<Map<String, String>> items,
            @AuthenticationPrincipal UserDetails ud) {
        var admin = usuarioRepository.findByCorreo(ud.getUsername())
            .orElseThrow(() -> new RecursoNoEncontradoException("Admin no encontrado"));
        Long eid2 = companyScope.getCurrentEmpresaIdOrOwn();
        // Verifica que el lote completo quepa dentro del plan antes de procesar (HTTP 403 si no)
        if (eid2 != null) tenantService.verificarLimiteBodegasBulk(eid2, items.size());
        var empresa = eid2 != null ? empresaRepository.findById(eid2).orElse(null) : null;
        int ok = 0; int errors = 0;
        for (Map<String, String> item : items) {
            String nombre = item.get("nombreBodega");
            String dir    = item.get("direccionExacta");
            String tel    = item.get("telefono");
            if (nombre == null || nombre.isBlank() || dir == null || dir.isBlank() || tel == null || tel.isBlank()) {
                errors++;
                continue;
            }
            Bodega b = new Bodega();
            b.setNombreBodega(nombre.trim());
            b.setDireccionExacta(dir.trim());
            b.setTelefono(tel.trim());
            b.setCorreoContacto(item.getOrDefault("correoContacto", ""));
            b.setEncargadoNombre(item.getOrDefault("encargadoNombre", ""));
            b.setProvincia(sanitizer.normalizeGeo(item.get("provincia")));
            b.setCanton(sanitizer.normalizeGeo(item.get("canton")));
            b.setEstado(Constants.ESTADO_ACTIVO);
            b.setEmpresa(empresa);
            b.setAdminCliente(admin);
            bodegaRepository.save(b);
            ok++;
        }
        String msg = "Importadas: " + ok + " bodegas" + (errors > 0 ? ", omitidas por datos incompletos: " + errors : "");
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("ok", ok, "errors", errors)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));
            companyScope.assertCanAccessNullable(b.getEmpresaId());
            if (body.get("nombreBodega") != null && !body.get("nombreBodega").isBlank())
                b.setNombreBodega(body.get("nombreBodega").trim());
            if (body.get("direccionExacta") != null && !body.get("direccionExacta").isBlank())
                b.setDireccionExacta(body.get("direccionExacta").trim());
            if (body.get("telefono") != null && !body.get("telefono").isBlank())
                b.setTelefono(body.get("telefono").trim());
            if (body.get("correoContacto") != null)
                b.setCorreoContacto(body.get("correoContacto"));
            if (body.get("encargadoNombre") != null)
                b.setEncargadoNombre(body.get("encargadoNombre"));
            if (body.containsKey("provincia"))
                b.setProvincia(sanitizer.normalizeGeo(body.get("provincia")));
            if (body.containsKey("canton"))
                b.setCanton(sanitizer.normalizeGeo(body.get("canton")));
            return ResponseEntity.ok(ResponseDTO.success("Bodega actualizada", bodegaRepository.save(b)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));
            companyScope.assertCanAccessNullable(b.getEmpresaId());
            b.setEstado(Constants.ESTADO_INACTIVO);
            bodegaRepository.save(b);
            return ResponseEntity.ok(ResponseDTO.success("Bodega eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
