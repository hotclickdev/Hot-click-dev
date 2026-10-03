package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.service.StockService;
import com.hotclick.service.producto.ProductoAccessGuard;
import com.hotclick.service.stock.OperadorCorreoMascara;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


/**
 * Inventario de un producto: historial y ajuste manual de entrada.
 * SEC-02: solo ADMIN o el vendedor (EMPRENDEDOR) dueño del producto. Un producto de otra
 * empresa responde igual que uno inexistente (404) para no revelar qué ids existen.
 */
@RestController
@RequestMapping("/api/stock")
@PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
public class StockController {

    static final String PRODUCTO_NO_ENCONTRADO = "Producto no encontrado";

    @Autowired private StockService stockService;
    @Autowired private ProductoAccessGuard productoAccessGuard;

    /** Historial completo de movimientos de un producto (dueño o ADMIN). */
    @GetMapping("/movimientos/{productoId}")
    public ResponseEntity<ResponseDTO> historial(@PathVariable Long productoId) {
        assertProductoPropio(productoId);
        boolean correoCompleto = productoAccessGuard.isAdminIT();
        List<Map<String, Object>> resultado = stockService.historialPorProducto(productoId)
            .stream()
            .map(m -> toMap(m, correoCompleto))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ResponseDTO.success("Historial de stock", resultado));
    }

    /**
     * Ajuste manual de entrada de stock (reposición).
     * Body: { "cantidad": 10, "notas": "Reposición proveedor X" }
     */
    @PostMapping("/ajuste-entrada/{productoId}")
    public ResponseEntity<ResponseDTO> ajustarEntrada(
            @PathVariable Long productoId,
            @RequestBody Map<String, Object> body,
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                org.springframework.security.core.userdetails.UserDetails userDetails) {
        assertProductoPropio(productoId);
        try {
            int cantidad = Integer.parseInt(body.get("cantidad").toString());
            String notas = body.getOrDefault("notas", "").toString();
            stockService.ajustarEntrada(productoId, cantidad, notas, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Stock actualizado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** 404 tanto si el producto no existe como si es de otra empresa (ADMIN pasa siempre). */
    private void assertProductoPropio(Long productoId) {
        try {
            productoAccessGuard.assertCanAccessProducto(productoId);
        } catch (TenantAccessDeniedException e) {
            throw new RecursoNoEncontradoException(PRODUCTO_NO_ENCONTRADO);
        }
    }

    private Map<String, Object> toMap(MovimientoStock m, boolean correoCompleto) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id",                    m.getId());
        map.put("tipoMovimiento",        m.getTipoMovimiento());
        map.put("cantidad",              m.getCantidad());
        map.put("stockActualAntes",      m.getStockActualAntes());
        map.put("stockActualDespues",    m.getStockActualDespues());
        map.put("stockReservadoAntes",   m.getStockReservadoAntes());
        map.put("stockReservadoDespues", m.getStockReservadoDespues());
        map.put("referencia",            m.getReferencia());
        map.put("operadorCorreo",        correoCompleto
            ? m.getOperadorCorreo()
            : OperadorCorreoMascara.enmascarar(m.getOperadorCorreo()));
        map.put("fechaMovimiento",       m.getFechaMovimiento());
        map.put("notas",                 m.getNotas());
        return map;
    }
}
