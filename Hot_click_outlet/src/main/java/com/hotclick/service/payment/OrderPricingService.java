package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.service.CuponService;
import com.hotclick.service.GiftCardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OrderPricingService {

    @Autowired private CuponService    cuponService;
    @Autowired private GiftCardService giftCardService;

    public OrderPricingResult calculate(PaymentCheckoutRequest req, Bodega bodega, int subtotal) {
        int costoEnvio = calcularCostoEnvio(req.getMetodoEnvio());

        // ── Validar y aplicar cupón de descuento ────────────────────────
        int descuento = 0;
        String codigoCuponAplicado = null;
        String codigoCupon = req.getCodigoCupon();
        if (codigoCupon != null && !codigoCupon.isBlank()) {
            Long empresaIdCupon = bodega.getEmpresa() != null ? bodega.getEmpresa().getId() : null;
            var cuponOpt = empresaIdCupon != null
                ? cuponService.validarCodigo(codigoCupon, empresaIdCupon)
                : cuponService.validarCodigo(codigoCupon);
            if (cuponOpt.isPresent()) {
                descuento = (int) Math.round(subtotal * cuponOpt.get().getDescuentoPorcentaje() / 100.0);
                codigoCuponAplicado = cuponOpt.get().getCodigo();
            }
        }
        int total = subtotal - descuento + costoEnvio;

        // ── Validar gift card (sin canjear aún) ─────────────────────────
        int    gcMonto  = 0;
        String gcCodigo = req.getCodigoGiftCard() != null ? req.getCodigoGiftCard().trim().toUpperCase() : null;
        if (gcCodigo != null && !gcCodigo.isBlank() && bodega.getEmpresa() != null) {
            var gcOpt = giftCardService.validar(gcCodigo, bodega.getEmpresa().getId());
            if (gcOpt.isPresent()) {
                gcMonto = Math.min(total, gcOpt.get().getSaldoActual());
            }
        }
        int totalConGC  = total - gcMonto;
        boolean pagoGC  = gcMonto > 0 && totalConGC == 0;

        return new OrderPricingResult(
            costoEnvio, descuento, codigoCuponAplicado, gcMonto, gcCodigo, total, totalConGC, pagoGC);
    }

    public int calcularCostoEnvio(String metodoEnvio) {
        if (metodoEnvio == null) return 0;
        return switch (metodoEnvio) {
            case "ENVIO_RAPIDO"            -> 5000;
            case "ENVIO_NORMAL_GAM"        -> 4000;
            case "ENVIO_NORMAL_FUERA_GAM"  -> 4000;
            case "ENCOMIENDA_PROPIA"       -> 2500;
            case "ENVIO_A_DOMICILIO"       -> 2000;
            default                        -> 0;
        };
    }
}
