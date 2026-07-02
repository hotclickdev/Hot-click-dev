package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.TurnoCaja;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.TenantService;
import com.hotclick.service.TurnoCajaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pos/caja")
public class TurnoCajaController {

    @Autowired private TurnoCajaService turnoCajaService;
    @Autowired private JwtUtil          jwtUtil;
    @Autowired private CompanyScope     companyScope;
    @Autowired private TenantService    tenantService;

    private static final String MSG_REQUIERE_POS =
        "El punto de venta requiere un plan PYME o superior. Ve a Configuración → Suscripción para mejorar tu plan.";

    @PostMapping("/abrir")
    @PreAuthorize("hasAuthority('pos.caja.abrir') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> abrir(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("pos"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_POS));
        try {
            Long usuarioId  = extractUserId(request);
            Long empresaId  = extractEmpresaId(request);
            Integer monto   = body.containsKey("montoInicial")
                ? Integer.valueOf(body.get("montoInicial").toString()) : 0;
            TurnoCaja turno = turnoCajaService.abrirTurno(usuarioId, empresaId, monto);
            return ResponseEntity.ok(ResponseDTO.success("Turno abierto correctamente", turno));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al abrir turno"));
        }
    }

    @PutMapping("/{id}/cerrar")
    @PreAuthorize("hasAuthority('pos.caja.cerrar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> cerrar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("pos"))
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_POS));
        try {
            Integer montoDeclarado = body.containsKey("montoDeclarado")
                ? Integer.valueOf(body.get("montoDeclarado").toString()) : 0;
            String notas = (String) body.get("notas");
            TurnoCaja turno = turnoCajaService.cerrarTurno(id, montoDeclarado, notas);
            return ResponseEntity.ok(ResponseDTO.success("Turno cerrado correctamente", turno));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al cerrar turno"));
        }
    }

    @GetMapping("/activo")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> getActivo(HttpServletRequest request) {
        try {
            Long usuarioId = extractUserId(request);
            return turnoCajaService.getTurnoActivo(usuarioId)
                .map(t -> ResponseEntity.ok(ResponseDTO.success("OK", t)))
                .orElseGet(() -> ResponseEntity.ok(ResponseDTO.success("Sin turno activo", null)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al consultar turno"));
        }
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> getHistorial(HttpServletRequest request) {
        try {
            Long empresaId = extractEmpresaId(request);
            return ResponseEntity.ok(ResponseDTO.success("OK",
                turnoCajaService.getHistorial(empresaId)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al consultar historial"));
        }
    }

    private Long extractUserId(HttpServletRequest request) {
        return jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));
    }

    private Long extractEmpresaId(HttpServletRequest request) {
        Long id = jwtUtil.extractEmpresaId(request.getHeader("Authorization").substring(7));
        if (id == null) throw new IllegalStateException("No hay empresa en el contexto del token");
        return id;
    }
}
