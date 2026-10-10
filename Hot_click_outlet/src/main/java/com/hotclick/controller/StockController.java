package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * SEC-02: historial y ajuste de stock solo para ADMIN o EMPRENDEDOR de la empresa
 * duenia del producto. Otra empresa: 403. Sin sesion: 401.
 */
@RestController
@RequestMapping("/api/stock")
@PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
public class StockController {

    private final StockService stockService;
    private final ProductoRepository productoRepository;
    private final CompanyScope companyScope;

    public StockController(StockService stockService,
                           ProductoRepository productoRepository,
                           CompanyScope companyScope) {
        this.stockService = stockService;
        this.productoRepository = productoRepository;
        this.companyScope = companyScope;
    }

    /** Historial completo de movimientos de un producto. */
    @GetMapping("/movimientos/{productoId}")
    public ResponseEntity<ResponseDTO> historial(@PathVariable Long productoId) {
        ResponseEntity<ResponseDTO> denegado = verificarProducto(productoId);
        if (denegado != null) return denegado;
        List<Map<String, Object>> resultado = stockService.historialPorProducto(productoId)
            .stream()
            .map(this::toMap)
            .toList();
        return ResponseEntity.ok(ResponseDTO.success("Historial de stock", resultado));
    }

    /**
     * Ajuste manual de entrada de stock (reposicion).
     * Body: { "cantidad": 10, "notas": "Reposicion proveedor X" }
     */
    @PostMapping("/ajuste-entrada/{productoId}")
    public ResponseEntity<ResponseDTO> ajustarEntrada(
            @PathVariable Long productoId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        ResponseEntity<ResponseDTO> denegado = verificarProducto(productoId);
        if (denegado != null) return denegado;
        try {
            int cantidad = Integer.parseInt(body.get("cantidad").toString());
            String notas = body.getOrDefault("notas", "").toString();
            stockService.ajustarEntrada(productoId, cantidad, notas, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Stock actualizado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** null si puede seguir; si no, 404 (no existe) o 403 (otra empresa). */
    private ResponseEntity<ResponseDTO> verificarProducto(Long productoId) {
        Optional<Long> empresaId = productoRepository.findEmpresaIdByProductoId(productoId);
        if (empresaId.isEmpty() && !productoRepository.existsById(productoId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ResponseDTO.error("Producto no encontrado"));
        }
        try {
            companyScope.assertCanAccessNullable(empresaId.orElse(null));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(e.getMessage()));
        }
        return null;
    }

    private Map<String, Object> toMap(MovimientoStock m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id",                    m.getId());
        map.put("tipoMovimiento",        m.getTipoMovimiento());
        map.put("cantidad",              m.getCantidad());
        map.put("stockActualAntes",      m.getStockActualAntes());
        map.put("stockActualDespues",    m.getStockActualDespues());
        map.put("stockReservadoAntes",   m.getStockReservadoAntes());
        map.put("stockReservadoDespues", m.getStockReservadoDespues());
        map.put("referencia",            m.getReferencia());
        map.put("operadorCorreo",        m.getOperadorCorreo());
        map.put("fechaMovimiento",       m.getFechaMovimiento());
        map.put("notas",                 m.getNotas());
        return map;
    }
}
