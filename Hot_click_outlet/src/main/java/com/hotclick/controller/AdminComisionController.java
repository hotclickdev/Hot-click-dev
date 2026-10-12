package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.wallet.ComisionPrecioMath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/configuracion/comision")
public class AdminComisionController {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CompanyScope companyScope;

    @GetMapping
    public ResponseEntity<ResponseDTO> obtener() {
        Empresa empresa = cargarEmpresa();
        return ResponseEntity.ok(ResponseDTO.success("Comisión", toMap(empresa)));
    }

    /**
     * SEG-1/P10-01: los parámetros de comisión los fija solo la plataforma (ADMIN, p. ej. impersonando
     * con escritura). El vendedor solo los lee. Rango 0–50 % para no permitir totales en ₡0.
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> actualizar(@RequestBody Map<String, Object> body,
                                                  @RequestParam(required = false) Long empresaId) {
        Long propia = companyScope.requireEmpresaIdOrAdmin();
        Long destino = propia != null ? propia : empresaId;
        if (destino == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("empresaId requerido"));
        }
        Empresa empresa = empresaRepository.findById(destino)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada: " + destino));
        try {
            if (body.get("pctComisionTarjeta") != null) {
                empresa.setPctComisionTarjeta(porcentaje(body.get("pctComisionTarjeta")));
            }
            if (body.get("montoFijoComisionCrc") != null) {
                int fijo = Integer.parseInt(body.get("montoFijoComisionCrc").toString());
                if (fijo < 0) throw new IllegalArgumentException("montoFijoComisionCrc");
                empresa.setMontoFijoComisionCrc(fijo);
            }
            if (body.get("pctDescuentoSinpe") != null) {
                empresa.setPctDescuentoSinpe(porcentaje(body.get("pctDescuentoSinpe")));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Valores de comisión fuera de rango (0 a 50 %)"));
        }
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Comisión actualizada", toMap(empresa)));
    }

    /** Calculadora de precio sugerido (gross-up). */
    @GetMapping("/sugerido")
    public ResponseEntity<ResponseDTO> precioSugerido(@RequestParam long neto) {
        Empresa empresa = cargarEmpresa();
        long sugerido = ComisionPrecioMath.precioSugerido(
            neto, empresa.getPctComisionTarjeta(), empresa.getMontoFijoComisionCrc());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("neto", neto);
        data.put("sugerido", sugerido);
        data.put("pct", empresa.getPctComisionTarjeta());
        data.put("fijo", empresa.getMontoFijoComisionCrc());
        return ResponseEntity.ok(ResponseDTO.success("Precio sugerido", data));
    }

    private static final BigDecimal PCT_MAX = new BigDecimal("50");

    private static BigDecimal porcentaje(Object raw) {
        BigDecimal v = new BigDecimal(raw.toString());
        if (v.signum() < 0 || v.compareTo(PCT_MAX) > 0) throw new IllegalArgumentException("pct");
        return v;
    }

    private Empresa cargarEmpresa() {
        Long id = companyScope.requireEmpresaId();
        return empresaRepository.findById(id)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada: " + id));
    }

    private static Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("pctComisionTarjeta", e.getPctComisionTarjeta());
        m.put("montoFijoComisionCrc", e.getMontoFijoComisionCrc());
        m.put("pctDescuentoSinpe", e.getPctDescuentoSinpe());
        return m;
    }
}
