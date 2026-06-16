package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantNotFoundException;
import com.hotclick.model.Cupon;
import com.hotclick.security.TenantContext;
import com.hotclick.service.CuponService;
import com.hotclick.service.EmpresaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * Validación de cupones tenant-aware para consumidores públicos: la tienda
 * por slug (sin JWT) y la app móvil POS interna (con JWT).
 *
 * Resolución del tenant, en orden:
 *   1. Header X-Tenant-Slug — usado por la tienda pública, que no tiene sesión.
 *   2. TenantContext.get() — poblado por TenantFilter a partir del JWT,
 *      usado por la app POS interna que ya está autenticada.
 *
 * Si ninguno de los dos resuelve una empresa, no hay forma segura de filtrar
 * el cupón por tenant y la petición se rechaza con 400.
 */
@RestController
@RequestMapping("/api/tienda/cupones")
public class TiendaCuponController {

    private final CuponService cuponService;
    private final EmpresaService empresaService;

    public TiendaCuponController(CuponService cuponService, EmpresaService empresaService) {
        this.cuponService = cuponService;
        this.empresaService = empresaService;
    }

    @GetMapping("/validar")
    public ResponseEntity<ResponseDTO> validar(
            @RequestParam String codigo,
            @RequestHeader(value = "X-Tenant-Slug", required = false) String tenantSlug) {

        Long empresaId = resolverEmpresaId(tenantSlug);

        Optional<Cupon> cupon = cuponService.validarCodigo(codigo, empresaId);
        if (cupon.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Este cupón no está disponible."));
        }

        return ResponseEntity.ok(ResponseDTO.success(
            "Cupón válido",
            Map.of("descuento", cupon.get().getDescuentoPorcentaje(), "codigo", cupon.get().getCodigo())
        ));
    }

    private Long resolverEmpresaId(String tenantSlug) {
        if (tenantSlug != null && !tenantSlug.isBlank()) {
            return empresaService.obtenerIdPorSlug(tenantSlug)
                .orElseThrow(() -> new TenantNotFoundException("Tienda no encontrada: " + tenantSlug));
        }

        Long contextEmpresaId = TenantContext.get();
        if (contextEmpresaId != null) {
            return contextEmpresaId;
        }

        throw new TenantNotFoundException("Se requiere el contexto de la tienda (X-Tenant-Slug o sesión autenticada)");
    }
}
