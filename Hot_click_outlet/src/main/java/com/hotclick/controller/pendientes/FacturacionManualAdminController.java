package com.hotclick.controller.pendientes;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * S5-13/S5-14/S5-16 (esqueleto; Frontend S5-20/S6-19): facturación manual TicoFactura, solo admin.
 * Depende de S1-07 (qué es «la tienda»), S5-01 (contador), S5-04 (circuito de factura del negocio) y el bucket privado.
 */
@RestController
@RequestMapping("/api/admin/facturacion")
@PreAuthorize("hasRole('ADMIN')")
public class FacturacionManualAdminController {

    private static final String FALTA = "definición de «la tienda» (S1-07), respuestas del contador (S5-01), circuito de factura del negocio (S5-04) y bucket privado";

    @GetMapping("/por-facturar")
    public ResponseEntity<Map<String, Object>> porFacturar() { return PendienteDecision.respuesta("S5-13", FALTA); }

    @GetMapping("/por-facturar/{id}")
    public ResponseEntity<Map<String, Object>> porFacturarDetalle(@PathVariable Long id) { return PendienteDecision.respuesta("S5-13", FALTA); }

    @GetMapping("/emitidas")
    public ResponseEntity<Map<String, Object>> emitidas() { return PendienteDecision.respuesta("S5-14", FALTA); }

    @PostMapping("/emitidas")
    public ResponseEntity<Map<String, Object>> registrarEmitida(@RequestParam(required = false) Long pedidoId,
                                                                @RequestParam(required = false) String clave,
                                                                @RequestParam(required = false) String consecutivo,
                                                                @RequestParam(required = false) MultipartFile pdf,
                                                                @RequestParam(required = false) MultipartFile xml) {
        if (clave != null && !clave.matches("\\d{50}")) {
            return PendienteDecision.error(org.springframework.http.HttpStatus.BAD_REQUEST, "CLAVE_INVALIDA", "La clave debe tener 50 dígitos");
        }
        if (consecutivo != null && !consecutivo.matches("\\d{20}")) {
            return PendienteDecision.error(org.springframework.http.HttpStatus.BAD_REQUEST, "CONSECUTIVO_INVALIDO", "El consecutivo debe tener 20 dígitos");
        }
        return PendienteDecision.respuesta("S5-14", FALTA);
    }

    @GetMapping("/negocios")
    public ResponseEntity<Map<String, Object>> facturasNegocios() { return PendienteDecision.respuesta("S5-16", FALTA); }

    @GetMapping("/acuerdos")
    public ResponseEntity<Map<String, Object>> acuerdos() { return PendienteDecision.respuesta("S5-16", FALTA); }
}
