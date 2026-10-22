package com.hotclick.service.payment;

import com.hotclick.model.Pago;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Compara lo que ONVO reporta por GET (checkout session + payment intent) contra el pago guardado.
 * El cuerpo del webhook solo dice "algo pasó"; esta comparación es la que decide si se confirma.
 * ONVO devuelve los montos en la unidad menor (céntimos); el pago local guarda colones enteros.
 */
public final class OnvoCobroVerificador {

    public static final String MONEDA_CRC = "CRC";
    static final long CENTIMOS_POR_COLON = 100L;

    public enum Decision {
        ACEPTAR,
        NO_PAGADO,
        RECHAZAR_MONTO
    }

    private OnvoCobroVerificador() {}

    /** Sesión pagada y completa, intent en succeeded, y monto y moneda iguales al pago local. */
    public static Decision decidir(Pago pago, Map<?, ?> sesion, Map<?, ?> intent) {
        if (!sesionPagada(sesion) || !"succeeded".equalsIgnoreCase(texto(intent, "status"))) {
            return Decision.NO_PAGADO;
        }
        if (!mismoIntent(sesion, intent)) {
            return Decision.RECHAZAR_MONTO;
        }
        return coincide(pago, intent) ? Decision.ACEPTAR : Decision.RECHAZAR_MONTO;
    }

    /** paymentStatus=paid; si ONVO manda status, tiene que ser complete (no open ni expired). */
    static boolean sesionPagada(Map<?, ?> sesion) {
        if (!"paid".equalsIgnoreCase(texto(sesion, "paymentStatus"))) {
            return false;
        }
        String status = texto(sesion, "status");
        return status == null || "complete".equalsIgnoreCase(status);
    }

    public static String paymentIntentId(Map<?, ?> sesion) {
        return texto(sesion, "paymentIntentId");
    }

    public static boolean coincide(Pago pago, Map<?, ?> intent) {
        if (pago == null || pago.getMonto() == null || intent == null) {
            return false;
        }
        if (!monedaCrc(texto(intent, "currency")) || !monedaCrc(monedaDelPago(pago))) {
            return false;
        }
        BigDecimal cobrado = numero(intent.get("amount"));
        BigDecimal esperado = BigDecimal.valueOf(pago.getMonto().longValue() * CENTIMOS_POR_COLON);
        return cobrado != null && cobrado.compareTo(esperado) == 0;
    }

    public static String mensajeAlerta(Pago pago, Map<?, ?> intent) {
        // El merchantToken (sessionId) es columna del pago: no inicializa el pedido lazy fuera de transacción.
        String sesion = pago != null ? pago.getMerchantToken() : "?";
        String esperado = pago != null && pago.getMonto() != null
            ? String.valueOf(pago.getMonto().longValue() * CENTIMOS_POR_COLON) : "?";
        String cobrado = intent != null && intent.get("amount") != null ? String.valueOf(intent.get("amount")) : "sin-monto";
        String moneda = intent != null && texto(intent, "currency") != null ? texto(intent, "currency") : "sin-moneda";
        return "ONVO no coincide con el pago sessionId=" + sesion
            + " esperado=" + esperado + " CRC(céntimos) cobrado=" + cobrado + " " + moneda;
    }

    /** El intent leído tiene que ser el de la sesión (si ONVO devuelve su id). */
    private static boolean mismoIntent(Map<?, ?> sesion, Map<?, ?> intent) {
        String esperado = paymentIntentId(sesion);
        String leido = texto(intent, "id");
        return leido == null || leido.equals(esperado);
    }

    private static String monedaDelPago(Pago pago) {
        return pago.getMoneda() == null || pago.getMoneda().isBlank() ? MONEDA_CRC : pago.getMoneda();
    }

    private static boolean monedaCrc(String moneda) {
        return moneda != null && MONEDA_CRC.equalsIgnoreCase(moneda.trim());
    }

    private static String texto(Map<?, ?> m, String campo) {
        Object v = m == null ? null : m.get(campo);
        return v == null ? null : String.valueOf(v);
    }

    private static BigDecimal numero(Object v) {
        if (v == null) return null;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
