package com.hotclick.controller;

import com.hotclick.service.payment.DescuentoSinpePublicoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DescuentoSinpePublicoController {

    private final DescuentoSinpePublicoService descuentoSinpePublicoService;

    public DescuentoSinpePublicoController(DescuentoSinpePublicoService descuentoSinpePublicoService) {
        this.descuentoSinpePublicoService = descuentoSinpePublicoService;
    }

    /** Público (checkout de invitado): {@code ?empresas=7,8} → {@code {"7": 5.00}}. */
    @GetMapping("/public/descuentos-sinpe")
    public ResponseEntity<Map<Long, BigDecimal>> descuentosSinpe(@RequestParam List<Long> empresas) {
        return ResponseEntity.ok(descuentoSinpePublicoService.porEmpresa(empresas));
    }
}
