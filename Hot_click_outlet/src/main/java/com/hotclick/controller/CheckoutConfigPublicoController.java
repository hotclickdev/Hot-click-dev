package com.hotclick.controller;

import com.hotclick.service.envio.ContraEntregaPolitica;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Público: opciones del checkout que dependen de configuración (sin datos sensibles). */
@RestController
@RequestMapping("/api")
public class CheckoutConfigPublicoController {

    private final ContraEntregaPolitica contraEntregaPolitica;

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica) {
        this.contraEntregaPolitica = contraEntregaPolitica;
    }

    /** {@code {"contraEntregaNormal": true}}: efectivo contra entrega en Envío Normal. */
    @GetMapping("/public/checkout-config")
    public ResponseEntity<Map<String, Boolean>> config() {
        return ResponseEntity.ok(Map.of("contraEntregaNormal", contraEntregaPolitica.habilitada()));
    }
}
