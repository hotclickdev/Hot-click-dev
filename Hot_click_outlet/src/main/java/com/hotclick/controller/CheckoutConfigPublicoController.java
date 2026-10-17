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
    private final com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard;

    /**
     * S2-27: true cuando ONVO Marketplace cobra un cargo por tienda en carritos con varias tiendas.
     * Apagado por defecto: se enciende por configuración cuando el cobro por tienda (S3-17) esté en vivo.
     */
    private final boolean pagoPorTienda;

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard) {
        this(contraEntregaPolitica, guestCheckoutGuard, false);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard,
                                           @org.springframework.beans.factory.annotation.Value("${hotclick.checkout.pago-por-tienda:false}") boolean pagoPorTienda) {
        this.contraEntregaPolitica = contraEntregaPolitica;
        this.guestCheckoutGuard = guestCheckoutGuard;
        this.pagoPorTienda = pagoPorTienda;
    }

    /**
     * {@code {"contraEntregaNormal": true, "maxUnidadesPorProducto": 3, "pagoPorTienda": false}}. El tope lo valida
     * GuestCheckoutGuard en el backend; aquí solo se publica para que el front lo muestre.
     */
    @GetMapping("/public/checkout-config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
            "contraEntregaNormal", contraEntregaPolitica.habilitada(),
            "maxUnidadesPorProducto", guestCheckoutGuard.getMaxPorProducto(),
            "pagoPorTienda", pagoPorTienda));
    }
}
