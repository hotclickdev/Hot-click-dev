package com.hotclick.controller;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/emprende")
public class EmprendePublicController {

    private final CupoEmprendedorService cupoEmprendedorService;

    private final PreciosPlanesConfig preciosPlanes;

    public EmprendePublicController(CupoEmprendedorService cupoEmprendedorService, PreciosPlanesConfig preciosPlanes) {
        this.cupoEmprendedorService = cupoEmprendedorService;
        this.preciosPlanes = preciosPlanes;
    }

    @GetMapping("/cupos")
    public Map<String, Object> cupos() {
        CupoEmprendedorEstado e = cupoEmprendedorService.estadoPublico();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("usados", e.usados());
        m.put("limite", e.limite());
        m.put("cuposGratisDisponibles", e.cuposGratisDisponibles());
        // Mensualidad USD de Emprendedor sin cupo, solo desde config; null si no está fijada (la UI no inventa monto).
        BigDecimal usd = preciosPlanes.precioUsd("EMPRENDEDOR").filter(v -> v.signum() > 0).orElse(null);
        m.put("mensualidadUsdSinCupo", usd);
        return m;
    }
}
