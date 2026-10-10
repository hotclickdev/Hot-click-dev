package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.analytics.MetricasPlataformaService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Tracción real de la plataforma y embudo de alta de vendedores. Solo administradores de HotClick. */
@RestController
@RequestMapping("/api/admin/metricas")
@PreAuthorize("hasRole('ADMIN')")
public class MetricasPlataformaController {

    private final MetricasPlataformaService service;

    public MetricasPlataformaController(MetricasPlataformaService service) {
        this.service = service;
    }

    @GetMapping("/traccion")
    public ResponseDTO traccion(@RequestParam(defaultValue = "30") int dias) {
        int ventana = Math.clamp(dias, 1, 365);
        return ResponseDTO.success("ok", service.traccion(ventana));
    }
}