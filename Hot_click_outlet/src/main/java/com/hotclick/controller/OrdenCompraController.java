package com.hotclick.controller;

import com.hotclick.dto.OrdenCompraDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.OrdenCompraService;
import com.hotclick.service.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/compras")
public class OrdenCompraController {

    private static final Logger log = LoggerFactory.getLogger(OrdenCompraController.class);
    private static final String MSG_REQUIERE_COMPRAS =
        "El módulo de Compras requiere un plan PYME o superior. Ve a Configuración → Suscripción para mejorar tu plan.";

    @Autowired private OrdenCompraService ordenCompraService;
    @Autowired private CompanyScope companyScope;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private TenantService tenantService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO','CONTABILIDAD')")
    public ResponseEntity<?> listar() {
        ResponseEntity<?> denegado = denegarSiSinCompras();
        if (denegado != null) return denegado;
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
        }
        return ResponseEntity.ok(ResponseDTO.success("OK", ordenCompraService.listarDeEmpresa(empresaId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            var orden = ordenCompraService.buscarConDetalles(id);
            companyScope.assertCanAccessNullable(orden.getEmpresa() != null ? orden.getEmpresa().getId() : null);
            return ResponseEntity.ok(ResponseDTO.success("OK", orden));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> crear(@RequestBody OrdenCompraDTO dto, HttpServletRequest request) {
        ResponseEntity<?> denegado = denegarSiSinCompras();
        if (denegado != null) return denegado;
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
        }
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La orden debe tener al menos un ítem"));
        }
        try {
            Long userId = jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));
            return ResponseEntity.ok(ResponseDTO.success("Orden de compra creada",
                ordenCompraService.crear(dto, empresaId, userId)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[Compras] Error al crear la orden: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear la orden"));
        }
    }

    @PutMapping("/{id}/recibir")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> recibirMercancia(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               HttpServletRequest request) {
        List<Map<String, Object>> itemsBody = itemsDelBody(body);
        if (itemsBody == null || itemsBody.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("items requeridos"));
        }
        try {
            String correo = jwtUtil.extractUsername(request.getHeader("Authorization").substring(7));
            return ResponseEntity.ok(ResponseDTO.success("Recepción registrada",
                ordenCompraService.recibir(id, itemsBody, correo)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[Compras] Error al recibir mercancía: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al recibir mercancía"));
        }
    }

    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> cancelar(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Orden cancelada", ordenCompraService.cancelar(id)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private ResponseEntity<?> denegarSiSinCompras() {
        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("compras")) {
            return ResponseEntity.status(403).body(ResponseDTO.error(MSG_REQUIERE_COMPRAS));
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> itemsDelBody(Map<String, Object> body) {
        Object rawItems = body.get("items");
        if (!(rawItems instanceof List)) return null;
        return (List<Map<String, Object>>) rawItems;
    }
}
