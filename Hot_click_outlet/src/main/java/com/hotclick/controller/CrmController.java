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
    @Autowired private com.hotclick.security.PropietarioGuard propietarioGuard;

    /**
     * SEG-E / P8-03: el módulo CRM (lista, ficha, edición, puntos, WhatsApp) solo con plan que lo incluya.
     * {@code buscar} y {@code crear} quedan abiertos porque los usa la caja (POS) para asignar cliente,
     * y el POS va en todos los planes (decisión del dueño, 16-oct-2026).
     */
    private static ResponseEntity<?> sinCrm() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(ResponseDTO.error(MSG_REQUIERE_CRM));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> listar() {
        if (crmAccessGuard.sinAccesoCrm()) return sinCrm();
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.listar(companyScope.requireEmpresaIdOrAdmin())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> crear(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
        }
        try {
            return ResponseEntity.ok(ResponseDTO.success("Cliente registrado",
                crmClientesService.crear(nombre, body.get("telefono"), body.get("correo"),
                    companyScope.getCurrentEmpresaIdOrOwn())));
        } catch (com.hotclick.exception.ClienteCorreoExistenteException e) {
            // revisión seg 063eb7f0d: antes 500 por unique; ahora 409 como asignar/crear-cliente.
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                .body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/buscar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> buscar(@RequestParam String q) {
        Long empresaId = companyScope.requireEmpresaIdOrAdmin();
        boolean cajero = propietarioGuard.esCajero(empresaId);
        // Seguridad #475: pasa por el guard del plan CRM salvo el CAJERO de equipo, que lo usa desde el POS.
        if (!cajero && crmAccessGuard.sinAccesoCrm()) return sinCrm();
        if (!cajero) return ResponseEntity.ok(ResponseDTO.success("OK", crmClientesService.buscar(q, empresaId)));
        // CAJERO: mínimo 3 caracteres y correo/teléfono enmascarados (solo identifica al cliente de la venta).
        if (q == null || q.trim().length() < 3) return ResponseEntity.ok(ResponseDTO.success("OK", java.util.List.of()));
        // acotado: el servicio ya corta en 20; limit explícito por SCALE1
        return ResponseEntity.ok(ResponseDTO.success("OK", crmClientesService.buscar(q, empresaId).stream()
            .limit(20).map(CrmController::enmascararParaCajero).toList()));
    }

    static Map<String, Object> enmascararParaCajero(Map<String, Object> c) {
        Map<String, Object> m = new java.util.LinkedHashMap<>(c);
        m.put("correo", com.hotclick.controller.crm.CrmClienteMapper.enmascararCorreo((String) c.get("correo")));
        m.put("telefono", com.hotclick.controller.crm.CrmClienteMapper.enmascararTelefono((String) c.get("telefono")));
        return m;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (crmAccessGuard.sinAccesoCrm()) return sinCrm();
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.detalle(id, companyScope.requireEmpresaIdOrAdmin())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (crmAccessGuard.sinAccesoCrm()) return sinCrm();
        try {
            return ResponseEntity.ok(ResponseDTO.success("Cliente actualizado",
                crmClientesService.actualizar(id, companyScope.requireEmpresaIdOrAdmin(), body)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/puntos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> ajustarPuntos(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (crmAccessGuard.sinAccesoCrm()) return sinCrm();
        try {
            int delta = Integer.parseInt(body.getOrDefault("delta", "0").toString());
            int nuevos = crmClientesService.ajustarPuntos(id, companyScope.requireEmpresaIdOrAdmin(), delta);
            return ResponseEntity.ok(ResponseDTO.success("Puntos actualizados", Map.of("puntosFidelidad", nuevos)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/wa")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> enviarWhatsApp(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (crmAccessGuard.sinAccesoCrm()) {
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        }
        try {
            String escenario = (String) body.getOrDefault("escenario", "REACTIVACION");
            @SuppressWarnings("unchecked")
            Map<String, String> ctxExtra = (Map<String, String>) body.getOrDefault("ctx", Map.of());
            return ResponseEntity.ok(ResponseDTO.success("Mensaje enviado",
                crmClientesService.enviarWhatsApp(id, companyScope.requireEmpresaIdOrAdmin(), escenario, ctxExtra)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (com.hotclick.exception.CrmWhatsAppLimiteException e) {
            return ResponseEntity.status(429).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/wa/historial")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> historialWa(@PathVariable Long id) {
        if (crmAccessGuard.sinAccesoCrm()) {
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_CRM));
        }
        return ResponseEntity.ok(ResponseDTO.success("OK",
            crmClientesService.historialWa(id, companyScope.requireEmpresaIdOrAdmin())));
    }
}
