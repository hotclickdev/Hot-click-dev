package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.EmpresaAdminService;
import com.hotclick.service.ImpersonacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/empresas")
public class EmpresaController {

    @Autowired private CompanyScope companyScope;
    @Autowired private EmpresaAdminService empresaAdminService;
    @Autowired private ImpersonacionService impersonacionService;

    @GetMapping
    public ResponseDTO listar(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "100") int size) {
        return ResponseDTO.success("Empresas", empresaAdminService.listar(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        return ResponseEntity.ok(ResponseDTO.success("Empresa", empresaAdminService.detalle(id)));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        companyScope.assertCanAccess(id);
        empresaAdminService.cambiarEstado(id, body.get("estadoEmpresa"));
        return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", null));
    }

    @PutMapping("/{id}/plan")
    public ResponseEntity<ResponseDTO> cambiarPlan(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        companyScope.assertCanAccess(id);
        String nombrePlan = empresaAdminService.cambiarPlan(id, body.get("plan"));
        return ResponseEntity.ok(ResponseDTO.success("Plan actualizado a " + nombrePlan, null));
    }

    @PutMapping("/{id}/visibilidad")
    public ResponseEntity<ResponseDTO> cambiarVisibilidad(@PathVariable Long id,
                                                          @RequestBody Map<String, Object> body) {
        companyScope.assertCanAccess(id);
        boolean visible = empresaAdminService.cambiarVisibilidad(id, body.get("visibilidadPublica"));
        String msg = visible ? "Negocio visible al público" : "Negocio oculto al público";
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("visibilidadPublica", visible)));
    }

    @GetMapping("/{id}/productos")
    public ResponseEntity<ResponseDTO> productos(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        return ResponseEntity.ok(ResponseDTO.success("Productos", empresaAdminService.productos(id)));
    }

    @GetMapping("/{id}/pedidos")
    public ResponseEntity<ResponseDTO> pedidos(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        return ResponseEntity.ok(ResponseDTO.success("Pedidos", empresaAdminService.pedidos(id)));
    }

    @GetMapping("/{id}/equipo")
    public ResponseEntity<ResponseDTO> equipo(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        return ResponseEntity.ok(ResponseDTO.success("Equipo", empresaAdminService.equipo(id)));
    }

    /**
     * Soporte: iniciar sesión de impersonación como el propietario de la empresa. Solo ADMIN.
     * El "finalizar" vive en ImpersonacionController bajo /api/impersonacion (no /api/admin/**),
     * porque SecurityAuthorizationRules exige rol ADMIN en todo /api/admin/empresas/** y quien
     * cierra la sesión ya está autenticado como el usuario impersonado, no como ADMIN.
     */
    @PostMapping("/{id}/impersonar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> impersonar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Sesión de impersonación iniciada", impersonacionService.iniciar(id)));
    }
}
