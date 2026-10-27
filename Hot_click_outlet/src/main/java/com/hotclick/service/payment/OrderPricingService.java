package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.service.CuponService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.wallet.ComisionPrecioMath;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;

@Service
public class OrderPricingService {

    @Autowired private CuponService    cuponService;
    @Autowired private GiftCardService giftCardService;

    /**
     * M-07: regla única de precio efectivo (catálogo, carrito, checkout y POS).
     * La oferta aplica solo si está activa y 0 &lt; precioOferta &lt; precioVenta; si no, precio normal.
     * Producto no tiene campos de vigencia; si se agregan, se validan acá.
     */
    public static Integer precioEfectivo(com.hotclick.model.Producto p) {
        Integer venta = p.getPrecioVenta();
        Integer oferta = p.getPrecioOferta();
        if (Boolean.TRUE.equals(p.getEnOferta()) && oferta != null && oferta > 0
                && venta != null && oferta < venta) {
            return oferta;
        }
        return venta;
    }

    /** M-07: precio de oferta a partir de un porcentaje; rechaza descuentos que dejan el precio en ≤ 0. */
    public static int calcularPrecioOferta(int precioVenta, int porcentajeDescuento) {
        if (porcentajeDescuento <= 0 || porcentajeDescuento >= 100) {
            throw new IllegalArgumentException("El descuento tiene que estar entre 1 % y 99 %.");
        }
        int oferta = (int) Math.round(precioVenta * (1 - porcentajeDescuento / 100.0));
        validarPrecioOferta(precioVenta, oferta);
        return oferta;
    }

    /** M-07: un precio de oferta fijo tiene que ser mayor que cero y menor que el precio normal. */
    public static void validarPrecioOferta(int precioVenta, int precioOferta) {
        if (precioOferta <= 0 || precioOferta >= precioVenta) {
            throw new IllegalArgumentException(
                "El precio de oferta tiene que ser mayor que cero y menor que el precio normal.");
        }
    }

    public OrderPricingResult calculate(PaymentCheckoutRequest req, Bodega bodega, int subtotal) {
        return calcularPaquete(req, bodega, subtotal, req.getMetodoEnvio(), Integer.MAX_VALUE);
    }

    /**
     * Precio de un paquete (una bodega de origen).
     *
     * @param gcSaldoRestante saldo de la tarjeta de regalo que aún no usaron otros paquetes del mismo checkout
     */
    public static final String MSG_CUPON_INVALIDO = "El cupón no es válido para estos productos. Quitalo o probá con otro.";

    /** CMP-2: un cupón escrito que no aplica a ningún negocio del carrito se rechaza (antes se ignoraba en silencio). */
    public void exigirCuponValido(String codigoCupon, java.util.Collection<Long> empresaIds) {
        if (codigoCupon == null || codigoCupon.isBlank()) return;
        boolean aplica = empresaIds.stream().anyMatch(id -> cuponService.validarParaEmpresa(codigoCupon, id).isPresent());
        if (!aplica) throw new IllegalArgumentException(MSG_CUPON_INVALIDO);
    }

    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio, int gcSaldoRestante) {
        return calcularPaquete(req, bodega, subtotal, metodoEnvio, gcSaldoRestante, java.util.List.of());
    }

    /**
     * @param lineasIva líneas del paquete; el IVA (M4: solo factura en régimen simplificado) se calcula
     *                  con CalculadoraIva sobre el neto después de descuentos, igual que el XML.
     */
    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio, int gcSaldoRestante,
                                              java.util.List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva) {
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

        int base = subtotal - descuento + costoEnvio;
        descuento += descuentoSinpeSiAplica(req.getProvider(), bodega, base);
        int impuesto = (int) com.hotclick.service.hacienda.CalculadoraIva.ivaACobrar(
            bodega.getEmpresa(), req.isFacturaElectronica(), lineasIva, descuento);
        int total = Math.max(0, subtotal - descuento + costoEnvio) + impuesto;

        int    gcMonto  = 0;
        String gcCodigo = req.getCodigoGiftCard() != null ? req.getCodigoGiftCard().trim().toUpperCase(java.util.Locale.ROOT) : null;
        if (gcCodigo != null && !gcCodigo.isBlank() && empresaId != null && gcSaldoRestante > 0) {
            var gcOpt = giftCardService.validar(gcCodigo, empresaId);
            if (gcOpt.isPresent()) {
                gcMonto = Math.min(total, Math.min(gcOpt.get().getSaldoActual(), gcSaldoRestante));
            }
        }
        int totalConGC  = total - gcMonto;
        boolean pagoGC  = gcMonto > 0 && totalConGC == 0;

        return new OrderPricingResult(
            costoEnvio, descuento, codigoCuponAplicado, gcMonto, gcCodigo, total, totalConGC, pagoGC, Math.max(0, impuesto));
    }

    private int descuentoSinpeSiAplica(String provider, Bodega bodega, int base) {
        if (provider == null || bodega == null || bodega.getEmpresa() == null) {
            return 0;
        }
        String p = provider.toUpperCase(Locale.ROOT);
        if (!Constants.PROVEEDOR_SINPE.equals(p) && !"EFECTIVO".equals(p)) {
            return 0;
        }
        Empresa empresa = bodega.getEmpresa();
        BigDecimal pct = empresa.getPctDescuentoSinpe();
        return (int) ComisionPrecioMath.descuentoSinpe(base, pct);
    }

    /** La encomienda la cobra la empresa de transporte al retirar en la terminal: no se cobra en el checkout. */
    public int calcularCostoEnvio(String metodoEnvio) {
        if (metodoEnvio == null) return 0;
        return switch (metodoEnvio) {
            case "ENVIO_RAPIDO"            -> 5000;
            case "ENVIO_NORMAL_GAM"        -> 4000;
            case "ENVIO_NORMAL_FUERA_GAM"  -> 4000;
            case "ENVIO_A_DOMICILIO"       -> 2000;
            // Encomienda ₡2.000 (12-oct-2026); lo que cobre la encomienda lo paga el comprador aparte.
            case "ENCOMIENDA_PROPIA"       -> 2000;
            default                        -> 0;
        };
    }
}
