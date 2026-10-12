package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.service.CuponService;
import com.hotclick.service.GiftCardService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OrderPricingService {

    @Autowired private CuponService    cuponService;
    @Autowired private GiftCardService giftCardService;

    public OrderPricingResult calculate(PaymentCheckoutRequest req, Bodega bodega, int subtotal) {
        return calcularPaquete(req, bodega, subtotal, req.getMetodoEnvio(), Integer.MAX_VALUE);
    }

    /**
     * Precio de un paquete (una bodega de origen).
     *
     * @param gcSaldoRestante saldo de la tarjeta de regalo que aún no usaron otros paquetes del mismo checkout
     */
    /** CMP-2: el cupón pedido tiene que valer para al menos uno de los negocios del checkout. */
    public void exigirCuponValido(String codigoCupon, java.util.Collection<Long> empresaIds) {
        if (codigoCupon == null || codigoCupon.isBlank()) return;
        for (Long empresaId : empresaIds) {
            if (cuponService.validarParaEmpresa(codigoCupon, empresaId).isPresent()) return;
        }
        throw new IllegalArgumentException("El cupón no es válido o ya venció.");
    }

    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio, int gcSaldoRestante) {
        int costoEnvio = calcularCostoEnvio(metodoEnvio);
        Long empresaId = bodega.getEmpresa() != null ? bodega.getEmpresa().getId() : null;

        int descuento = 0;
        String codigoCuponAplicado = null;
        String codigoCupon = req.getCodigoCupon();
        if (codigoCupon != null && !codigoCupon.isBlank()) {
            var cuponOpt = cuponService.validarParaEmpresa(codigoCupon, empresaId);
            if (cuponOpt.isPresent()) {
                descuento = (int) Math.round(subtotal * cuponOpt.get().getDescuentoPorcentaje() / 100.0);
                codigoCuponAplicado = cuponOpt.get().getCodigo();
            }
        }

        // Decisión del dueño (oct-2026): mismo precio con tarjeta o SINPE. El cupón se aplica acá, en el
        // backend, antes de cobrar; este total es el que se manda a Tilopay y el que ve el comprador.
        int total = Math.max(0, subtotal - descuento + costoEnvio);

        int    gcMonto  = 0;
        String gcCodigo = req.getCodigoGiftCard() != null ? req.getCodigoGiftCard().trim().toUpperCase() : null;
        if (gcCodigo != null && !gcCodigo.isBlank() && empresaId != null && gcSaldoRestante > 0) {
            var gcOpt = giftCardService.validar(gcCodigo, empresaId);
            if (gcOpt.isPresent()) {
                gcMonto = Math.min(total, Math.min(gcOpt.get().getSaldoActual(), gcSaldoRestante));
            }
        }
        int totalConGC  = total - gcMonto;
        boolean pagoGC  = gcMonto > 0 && totalConGC == 0;

        return new OrderPricingResult(
            costoEnvio, descuento, codigoCuponAplicado, gcMonto, gcCodigo, total, totalConGC, pagoGC);
    }

    /** La encomienda la cobra la empresa de transporte al retirar en la terminal: no se cobra en el checkout. */
    public int calcularCostoEnvio(String metodoEnvio) {
        if (metodoEnvio == null) return 0;
        return switch (metodoEnvio) {
            case "ENVIO_RAPIDO"            -> 5000;
            case "ENVIO_NORMAL_GAM"        -> 4000;
            case "ENVIO_NORMAL_FUERA_GAM"  -> 4000;
            case "ENVIO_A_DOMICILIO"       -> 2000;
            default                        -> 0;
        };
    }
}
