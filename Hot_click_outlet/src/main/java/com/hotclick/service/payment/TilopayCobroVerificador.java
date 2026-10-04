package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.service.TilopayService;

import java.math.BigDecimal;

/**
 * Compara el cobro que Tilopay reporta en /api/v1/consult contra el pago guardado.
 * El navegador puede cambiar el monto del SDK; esta comparación es la que decide si se cumple.
 */
public final class TilopayCobroVerificador {

    public static final String MONEDA_CRC = "CRC";

    public enum Decision {
        ACEPTAR,
        RECHAZAR_MONTO,
        RECHAZAR_SIMULACION,
        RECHAZAR_PASARELA
    }

    private TilopayCobroVerificador() {}

    public static Decision decidir(Pago pago, TilopayService.ConsultaResultado consulta, boolean mockMode) {
        if (consulta == null || !consulta.aprobada()) {
            return Decision.RECHAZAR_PASARELA;
        }
        if (consulta.simulada()) {
            return mockMode ? Decision.ACEPTAR : Decision.RECHAZAR_SIMULACION;
        }
        return coincide(pago, consulta) ? Decision.ACEPTAR : Decision.RECHAZAR_MONTO;
    }

    public static boolean coincide(Pago pago, TilopayService.ConsultaResultado consulta) {
        if (pago == null || consulta == null || consulta.amount() == null || pago.getMonto() == null) {
            return false;
        }
        if (!monedaCrc(consulta.currency()) || !monedaCrc(monedaDelPago(pago))) {
            return false;
        }
        if (consulta.amount().compareTo(BigDecimal.valueOf(pago.getMonto().longValue())) != 0) {
            return false;
        }
        return mismoPedido(pago.getMerchantToken(), consulta.orderNumber());
    }

    public static String mensajeAlerta(Pago pago, TilopayService.ConsultaResultado consulta) {
        String order = pago != null ? pago.getMerchantToken() : "?";
        String esperado = pago != null && pago.getMonto() != null ? pago.getMonto().toString() : "?";
        String moneda = pago != null ? monedaDelPago(pago) : MONEDA_CRC;
        String cobrado = consulta != null && consulta.amount() != null ? consulta.amount().toPlainString() : "sin-monto";
        String monedaCobro = consulta != null && consulta.currency() != null ? consulta.currency() : "sin-moneda";
        String ordenCobro = consulta != null ? consulta.orderNumber() : null;
        return "Tilopay no coincide con el pedido order=" + order
                + " esperado=" + esperado + " " + moneda
                + " cobrado=" + cobrado + " " + monedaCobro
                + " orderCobro=" + ordenCobro;
    }

    private static String monedaDelPago(Pago pago) {
        if (pago.getMoneda() == null || pago.getMoneda().isBlank()) {
            return MONEDA_CRC;
        }
        return pago.getMoneda();
    }

    private static boolean monedaCrc(String moneda) {
        return moneda != null && MONEDA_CRC.equalsIgnoreCase(moneda.trim());
    }

    private static boolean mismoPedido(String esperado, String cobrado) {
        return esperado != null && cobrado != null && esperado.equals(cobrado.trim());
    }
}
