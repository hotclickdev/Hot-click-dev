package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.AdsGastoDiario;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.analytics.AdsMetricasService;
import com.hotclick.utils.Constants;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ads")
@PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
public class AdsMetricasController {

    private final AdsMetricasService adsMetricasService;
    private final CompanyScope companyScope;

    public AdsMetricasController(AdsMetricasService adsMetricasService, CompanyScope companyScope) {
        this.adsMetricasService = adsMetricasService;
        this.companyScope = companyScope;
    }

    @GetMapping("/metricas")
    public ResponseEntity<?> metricas(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(defaultValue = "7") int ventanaDias) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        LocalDate hastaD = parseOr(hasta, LocalDate.now(Constants.ZONA_CR));
        LocalDate desdeD = parseOr(desde, hastaD.minusDays(29));
        int ventana = ventanaDias == 1 || ventanaDias == 28 ? ventanaDias : 7;
        return ResponseEntity.ok(ResponseDTO.success("OK",
            adsMetricasService.resumen(empresaId, desdeD, hastaD, ventana)));
    }

    @GetMapping("/gastos")
    public ResponseEntity<?> listarGastos(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        LocalDate hastaD = parseOr(hasta, LocalDate.now(Constants.ZONA_CR));
        LocalDate desdeD = parseOr(desde, hastaD.minusDays(29));
        return ResponseEntity.ok(ResponseDTO.success("OK",
            adsMetricasService.listarGastos(empresaId, desdeD, hastaD)));
    }

    @PostMapping("/gastos")
    public ResponseEntity<?> crearGasto(@RequestBody Map<String, Object> body) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        String fecha = str(body.get("fecha"));
        String campana = str(body.get("campana"));
        if (fecha == null || campana == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("fecha y campana son requeridos"));
        }
        int monto = 0;
        try {
            monto = Integer.parseInt(String.valueOf(body.getOrDefault("montoCrc", "0")));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("montoCrc inválido"));
        }
        AdsGastoDiario g = adsMetricasService.upsertGasto(
            empresaId,
            LocalDate.parse(fecha),
            str(body.get("canal")),
            campana,
            monto,
            str(body.get("notas")),
            "manual");
        return ResponseEntity.ok(ResponseDTO.success("Gasto registrado", g));
    }

    @DeleteMapping("/gastos/{id}")
    public ResponseEntity<?> eliminarGasto(@PathVariable Long id) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        try {
            adsMetricasService.eliminarGasto(id, empresaId);
            return ResponseEntity.ok(ResponseDTO.success("Gasto eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private static LocalDate parseOr(String raw, LocalDate fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        return LocalDate.parse(raw);
    }

    private static String str(Object o) {
        if (o == null) return null;
        String s = o.toString().trim();
        return s.isEmpty() ? null : s;
    }
}
