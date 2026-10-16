package com.hotclick.controller;

import com.hotclick.service.payment.OrderPricingService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

/** Tarifas de envío (₡ por método) para que el frontend no tenga su propia copia de la tabla. */
@RestController
@RequestMapping("/api/public/envio")
public class EnvioTarifasPublicController {

    private final OrderPricingService pricing;

    public EnvioTarifasPublicController(OrderPricingService pricing) {
        this.pricing = pricing;
    }

    @GetMapping("/tarifas")
    public ResponseEntity<Map<String, Integer>> tarifas() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(pricing.tarifasEnvio());
    }
}
