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

    /**
     * Espejo de solo lectura de {@code hotclick.checkout.sinpe-manual.habilitado} (default false, igual que
     * SinpeCheckoutService, que es quien valida). El front solo muestra SINPE con comprobante si es true.
     */
    private final boolean sinpeManual;

    /**
     * true solo si {@code payments.onvo.enabled} y ONVO puede cobrar ({@link com.hotclick.service.OnvoService#isPagosDisponibles()}:
     * llave configurada, o simulación únicamente en dev/test). Fail-closed: si no, Tarjeta queda «Próximamente».
     */
    private final boolean tarjetaOnvo;

    /** Destino SINPE Móvil de ONVO (onvo.sinpe-destino). Vacío = SINPE manual no se publica (fail-closed). */
    private String sinpeDestino = "";

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard) {
        this(contraEntregaPolitica, guestCheckoutGuard, false, false, false);
    }

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard,
                                           boolean pagoPorTienda) {
        this(contraEntregaPolitica, guestCheckoutGuard, pagoPorTienda, false, false);
    }

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard,
                                           boolean pagoPorTienda, boolean sinpeManual) {
        this(contraEntregaPolitica, guestCheckoutGuard, pagoPorTienda, sinpeManual, false);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard,
                                           @org.springframework.beans.factory.annotation.Value("${hotclick.checkout.pago-por-tienda:false}") boolean pagoPorTienda,
                                           @org.springframework.beans.factory.annotation.Value("${hotclick.checkout.sinpe-manual.habilitado:false}") boolean sinpeManual,
                                           @org.springframework.beans.factory.annotation.Value("${payments.onvo.enabled:false}") boolean onvoHabilitado,
                                           org.springframework.beans.factory.ObjectProvider<com.hotclick.service.OnvoService> onvoService) {
        this(contraEntregaPolitica, guestCheckoutGuard, pagoPorTienda, sinpeManual,
            onvoHabilitado && onvoService != null && onvoService.getIfAvailable() != null
                && onvoService.getIfAvailable().isPagosDisponibles());
        com.hotclick.service.OnvoService onvo = onvoService != null ? onvoService.getIfAvailable() : null;
        String destino = onvo != null ? onvo.sinpeDestino() : null;
        this.sinpeDestino = destino == null ? "" : destino.trim();
    }

    /** Para tests y wiring manual. */
    public CheckoutConfigPublicoController conSinpeDestino(String destino) {
        this.sinpeDestino = destino == null ? "" : destino.trim();
        return this;
    }

    public CheckoutConfigPublicoController(ContraEntregaPolitica contraEntregaPolitica,
                                           com.hotclick.service.payment.GuestCheckoutGuard guestCheckoutGuard,
                                           boolean pagoPorTienda, boolean sinpeManual, boolean tarjetaOnvo) {
        this.contraEntregaPolitica = contraEntregaPolitica;
        this.guestCheckoutGuard = guestCheckoutGuard;
        this.pagoPorTienda = pagoPorTienda;
        this.sinpeManual = sinpeManual;
        this.tarjetaOnvo = tarjetaOnvo;
    }

    /**
     * {@code {"contraEntregaNormal": true, "maxUnidadesPorProducto": 3, "pagoPorTienda": false, "sinpeManual": false}}. El tope lo valida
     * GuestCheckoutGuard en el backend; aquí solo se publica para que el front lo muestre.
     */
    @GetMapping("/public/checkout-config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
            "contraEntregaNormal", contraEntregaPolitica.habilitada(),
            "maxUnidadesPorProducto", guestCheckoutGuard.getMaxPorProducto(),
            "pagoPorTienda", pagoPorTienda,
            "sinpeManual", sinpeManual && !sinpeDestino.isEmpty(),
            "sinpeDestino", sinpeDestino,
            "tarjetaOnvo", tarjetaOnvo));
    }
}
