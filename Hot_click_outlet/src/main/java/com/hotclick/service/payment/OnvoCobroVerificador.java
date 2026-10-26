package com.hotclick.service.payment;

import com.hotclick.model.Pago;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

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
        /** El intent sigue en curso (3DS, cobro asíncrono): todavía puede cobrarse, no se cancela. */
        EN_PROCESO,
        NO_PAGADO,
        RECHAZAR_MONTO,
        /** La sesión o el intent son de otro modo (test/live) que la llave configurada. */
        RECHAZAR_MODO
    }

    /** Estados del intent (OpenAPI de ONVO) en los que el cobro todavía puede terminar en succeeded. */
    static final Set<String> INTENT_EN_PROCESO = Set.of("processing", "requires_action", "requires_capture");

    private OnvoCobroVerificador() {}

    /**
     * Sesión pagada (open o complete, nunca expired), intent en succeeded, mismo modo que la llave, y monto y moneda iguales
     * al pago local. {@code modoEsperado} es «live» o «test» según la llave (ver OnvoService#modoEsperado).
     */
    public static Decision decidir(Pago pago, Map<?, ?> sesion, Map<?, ?> intent, String modoEsperado) {
        if (!modoCoincide(sesion, modoEsperado) || !modoCoincide(intent, modoEsperado)) {
            return Decision.RECHAZAR_MODO;
        }
        String estadoIntent = texto(intent, "status");
        if (estadoIntent != null && INTENT_EN_PROCESO.contains(estadoIntent.toLowerCase(java.util.Locale.ROOT))) {
            return Decision.EN_PROCESO;
        }
        if (!sesionPagada(sesion) || !"succeeded".equalsIgnoreCase(estadoIntent)) {
            return Decision.NO_PAGADO;
        }
        if (!mismoIntent(sesion, intent)) {
            return Decision.RECHAZAR_MONTO;
        }
        return coincide(pago, intent) ? Decision.ACEPTAR : Decision.RECHAZAR_MONTO;
    }

    /**
     * Caso 3 QA: paymentStatus=paid y la sesión no vencida. ONVO documenta {@code status} como estado de la
     * SESIÓN (open/complete/expired) y {@code paymentStatus} como el del PAGO; no garantiza que la sesión pase
     * a complete al pagarse (QA vio paid+open con el intent succeeded). La prueba fuerte es el intent
     * succeeded, que {@link #decidir} exige aparte. Fail-closed: status ausente o desconocido no vale.
     */
    static boolean sesionPagada(Map<?, ?> sesion) {
        if (!"paid".equalsIgnoreCase(texto(sesion, "paymentStatus"))) {
            return false;
        }
        String status = texto(sesion, "status");
        return status != null && SESION_VIGENTE_O_COMPLETA.contains(status.toLowerCase(java.util.Locale.ROOT));
    }

    /** Estados de sesión aceptables con paymentStatus=paid: todo menos expired (y menos valores desconocidos). */
    static final Set<String> SESION_VIGENTE_O_COMPLETA = Set.of("open", "complete");

    /**
     * C9 fail-closed: sin modo esperado no se acepta, y ONVO tiene que informar el modo (live/test)
     * y que sea el de la llave. Un payload sin «mode» se rechaza siempre.
     */
    static boolean modoCoincide(Map<?, ?> objeto, String modoEsperado) {
        if (modoEsperado == null || modoEsperado.isBlank()) {
            return false;
        }
        String modo = texto(objeto, "mode");
        return modo != null && modo.equalsIgnoreCase(modoEsperado);
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

    /** C9: el intent leído tiene que traer su id y ser el de la sesión; sin id (o sin id en la sesión) se rechaza. */
    private static boolean mismoIntent(Map<?, ?> sesion, Map<?, ?> intent) {
        String esperado = paymentIntentId(sesion);
        String leido = texto(intent, "id");
        return leido != null && esperado != null && leido.equals(esperado);
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
