package com.hotclick.controller;

import com.hotclick.controller.crm.CrmAccessGuard;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.CrmClientesService;
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
@RequestMapping("/api/crm/clientes")
public class CrmController {

    private static final String MSG_REQUIERE_CRM =
        "El CRM de clientes requiere el plan NEGOCIO_PLUS. Ve a Configuración → Suscripción para mejorar tu plan.";

    @Autowired private CompanyScope companyScope;
    @Autowired private CrmAccessGuard crmAccessGuard;
    @Autowired private CrmClientesService crmClientesService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.listar(companyScope.getCurrentEmpresaId())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','CAJERO')")
    public ResponseEntity<?> crear(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
        }
        return ResponseEntity.ok(ResponseDTO.success("Cliente registrado",
            crmClientesService.crear(nombre, body.get("telefono"), body.get("correo"),
                companyScope.getCurrentEmpresaIdOrOwn())));
    }

    @GetMapping("/buscar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','CAJERO','SUPERVISOR','SOPORTE')")
    public ResponseEntity<?> buscar(@RequestParam String q) {
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.buscar(q, companyScope.getCurrentEmpresaId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.detalle(id, companyScope.getCurrentEmpresaId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Cliente actualizado",
                crmClientesService.actualizar(id, companyScope.getCurrentEmpresaId(), body)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/puntos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> ajustarPuntos(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            int delta = Integer.parseInt(body.getOrDefault("delta", "0").toString());
            int nuevos = crmClientesService.ajustarPuntos(id, companyScope.getCurrentEmpresaId(), delta);
            return ResponseEntity.ok(ResponseDTO.success("Puntos actualizados", Map.of("puntosFidelidad", nuevos)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/wa")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> enviarWhatsApp(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (crmAccessGuard.sinAccesoCrm()) {
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        }
        try {
            String escenario = (String) body.getOrDefault("escenario", "REACTIVACION");
            @SuppressWarnings("unchecked")
            Map<String, String> ctxExtra = (Map<String, String>) body.getOrDefault("ctx", Map.of());
            return ResponseEntity.ok(ResponseDTO.success("Mensaje enviado",
                crmClientesService.enviarWhatsApp(id, companyScope.getCurrentEmpresaId(), escenario, ctxExtra)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/wa/historial")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','SOPORTE')")
    public ResponseEntity<?> historialWa(@PathVariable Long id) {
        if (crmAccessGuard.sinAccesoCrm()) {
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        }
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.historialWa(id, companyScope.getCurrentEmpresaId())));
    }
}
