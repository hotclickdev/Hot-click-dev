package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.stock.AjusteEntradaRequest;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.MovimientoStock;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(StockController.class);
    static final String CANTIDAD_INVALIDA = "La cantidad debe estar entre 1 y 100000";
    static final String NOTAS_LARGAS = "Las notas admiten hasta 500 caracteres";
    static final String ERROR_GENERICO = "No se pudo ajustar el stock";

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
            @Valid @RequestBody AjusteEntradaRequest body,
            @AuthenticationPrincipal UserDetails userDetails) {
        ResponseEntity<ResponseDTO> denegado = verificarProducto(productoId);
        if (denegado != null) return denegado;
        // SEC02-01: chequeo de servidor ademas de la validacion del bean (llamadas directas / sin @Valid).
        Integer cantidad = body == null ? null : body.cantidad();
        if (cantidad == null || cantidad < AjusteEntradaRequest.CANTIDAD_MIN || cantidad > AjusteEntradaRequest.CANTIDAD_MAX) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(CANTIDAD_INVALIDA));
        }
        String notas = body.notas() == null ? "" : body.notas();
        if (notas.length() > AjusteEntradaRequest.NOTAS_MAX) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(NOTAS_LARGAS));
        }
        try {
            stockService.ajustarEntrada(productoId, cantidad, notas, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Stock actualizado", null));
        } catch (RuntimeException e) {
            // SEC02-03: nunca devolver el mensaje crudo de la excepcion.
            log.warn("[stock] ajuste-entrada rechazado producto={} causa={}", productoId, e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(ResponseDTO.error(ERROR_GENERICO));
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
        map.put("operadorCorreo",        enmascararCorreo(m.getOperadorCorreo()));
        map.put("fechaMovimiento",       m.getFechaMovimiento());
        map.put("notas",                 m.getNotas());
        return map;
    }

    /** SEC02-02: "juan@dominio.cr" -> "j***@dominio.cr"; sin '@' -> "***". */
    static String enmascararCorreo(String correo) {
        if (correo == null || correo.isBlank()) return correo;
        int at = correo.indexOf('@');
        if (at <= 0) return "***";
        return correo.charAt(0) + "***" + correo.substring(at);
    }
}
