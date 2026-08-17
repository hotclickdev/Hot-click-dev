package com.hotclick.controller;

import com.hotclick.dto.PosVentaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.pos.PosVentaService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pos")
public class PosController {

    private static final Logger log = LoggerFactory.getLogger(PosController.class);

    @Autowired private JwtUtil jwtUtil;
    @Autowired private PosVentaService posVentaService;

    @PostMapping("/venta")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR','CAJERO','GERENTE','SUPERVISOR')")
    public ResponseEntity<?> crearVenta(@RequestBody PosVentaDTO dto, HttpServletRequest request) {
        // El POS está disponible para todos los planes (decisión de negocio
        // jul 2026) — no se gatea por feature "pos".
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El carrito no puede estar vacío"));
        }
        try {
            Pedido saved = posVentaService.crearVenta(
                dto, extractUserId(request), extractEmpresaId(request), extractCorreo(request));
            return ResponseEntity.ok(ResponseDTO.success("Venta registrada", saved));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[POS] Error al crear venta: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al procesar la venta"));
        }
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR','CAJERO','GERENTE','SUPERVISOR')")
    public ResponseEntity<?> historialVentas(HttpServletRequest request) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("OK", posVentaService.historial(extractEmpresaId(request))));
        } catch (Exception e) {
            log.error("[POS] Error al cargar historial: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al cargar historial"));
        }
    }

    private String extractCorreo(HttpServletRequest request) {
        return jwtUtil.extractUsername(request.getHeader("Authorization").substring(7));
    }

    private Long extractUserId(HttpServletRequest request) {
        return jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));
    }

    private Long extractEmpresaId(HttpServletRequest request) {
        Long id = jwtUtil.extractEmpresaId(request.getHeader("Authorization").substring(7));
        if (id == null) throw new IllegalStateException("No hay empresa en el token");
        return id;
    }
}
