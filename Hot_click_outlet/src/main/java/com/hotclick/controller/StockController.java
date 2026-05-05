package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.MovimientoStock;
import com.hotclick.service.StockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/stock")
public class StockController {

    @Autowired private StockService stockService;

    /** Historial completo de movimientos de un producto (admin). */
    @GetMapping("/movimientos/{productoId}")
    public ResponseEntity<ResponseDTO> historial(@PathVariable Long productoId) {
        List<Map<String, Object>> resultado = stockService.historialPorProducto(productoId)
            .stream()
            .map(this::toMap)
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
        try {
            int cantidad = Integer.parseInt(body.get("cantidad").toString());
            String notas = body.getOrDefault("notas", "").toString();
            stockService.ajustarEntrada(productoId, cantidad, notas, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Stock actualizado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
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
