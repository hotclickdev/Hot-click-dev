package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.service.wallet.ComisionPrecioMath;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;

@Service
public class OrderPricingService {

    /** A-2: montos de envío fijados por ADMIN; sin bean (tests unitarios) valen los defaults (4.000 / 5.500 / 5.000). */
    @Autowired(required = false) private com.hotclick.service.envio.ConfiguracionEnvioService configuracionEnvio;

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
        return calcularPaquete(req, bodega, subtotal, req.getMetodoEnvio());
    }

    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio) {
        return calcularPaquete(req, bodega, subtotal, metodoEnvio, java.util.List.of());
    }

    /**
     * @param lineasIva líneas del paquete; el IVA (M4: solo factura en régimen simplificado) se calcula
     *                  con CalculadoraIva sobre el neto después de descuentos, igual que el XML.
     */
    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio,
                                              java.util.List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva) {
        return calcularPaquete(req, bodega, subtotal, metodoEnvio, lineasIva, calcularCostoEnvio(metodoEnvio));
    }

    /**
     * A-2: {@code costoEnvio} ya resuelto por negocio (lo calcula {@code CheckoutGrupoFactory}): el envío se cobra
     * una vez por empresa, no por bodega; los demás paquetes del mismo negocio llegan con 0.
     */
    public OrderPricingResult calcularPaquete(PaymentCheckoutRequest req, Bodega bodega, int subtotal,
                                              String metodoEnvio,
                                              java.util.List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva,
                                              int costoEnvio) {
        // Los cupones se retiraron (decisión del dueño): el único descuento del checkout es el de SINPE/efectivo.
        int descuento = 0;

        int base = subtotal - descuento + costoEnvio;
        descuento += descuentoSinpeSiAplica(req.getProvider(), bodega, base);
        int impuesto = com.hotclick.service.hacienda.MontoExacto.aInt(com.hotclick.service.hacienda.CalculadoraIva.ivaACobrar(
            bodega.getEmpresa(), req.isFacturaElectronica(), lineasIva, descuento));
        int total = Math.max(0, subtotal - descuento + costoEnvio) + impuesto;

        return new OrderPricingResult(
            costoEnvio, descuento, total, Math.max(0, impuesto));
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
        return com.hotclick.service.hacienda.MontoExacto.aInt(ComisionPrecioMath.descuentoSinpe(base, pct));
    }

    /** La encomienda la cobra la empresa de transporte al retirar en la terminal: no se cobra en el checkout. */
    public int calcularCostoEnvio(String metodoEnvio) {
        if (metodoEnvio == null) return 0;
        com.hotclick.service.envio.ConfiguracionEnvioService.Montos m = montos();
        return switch (metodoEnvio) {
            // A-2: los tres montos los configura ADMIN; GAM o fuera lo decide el servidor (metodoNormalPorDestino).
            case "ENVIO_RAPIDO"            -> m.rapido();
            case "ENVIO_NORMAL_GAM"        -> m.gam();
            case "ENVIO_NORMAL_FUERA_GAM"  -> m.fueraGam();
            case "ENVIO_A_DOMICILIO"       -> 2000;
            // Encomienda ₡2.000 (12-oct-2026); lo que cobre la encomienda lo paga el comprador aparte.
            case "ENCOMIENDA_PROPIA"       -> 2000;
            default                        -> 0;
        };
    }

    private com.hotclick.service.envio.ConfiguracionEnvioService.Montos montos() {
        return configuracionEnvio != null ? configuracionEnvio.montos()
            : com.hotclick.service.envio.ConfiguracionEnvioService.DEFAULTS;
    }

    /**
     * A-2: el envío normal GAM o fuera del GAM lo decide el servidor con el destino (provincia y cantón);
     * lo que eligió el cliente se ignora. Destino ausente o desconocido: fuera del GAM. Otros métodos, igual.
     */
    public static String metodoNormalPorDestino(String metodoEnvio, String provincia, String canton) {
        if (!"ENVIO_NORMAL_GAM".equals(metodoEnvio) && !"ENVIO_NORMAL_FUERA_GAM".equals(metodoEnvio)) return metodoEnvio;
        return com.hotclick.service.envio.ZonaEnvio.esGam(provincia, canton) ? "ENVIO_NORMAL_GAM" : "ENVIO_NORMAL_FUERA_GAM";
    }
}
