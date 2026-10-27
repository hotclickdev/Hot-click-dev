package com.hotclick.service.suscripcion;

import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;

/**
 * S-02: decide si un evento de billing ONVO se aplica, con lo que ONVO devuelve por GET (no con el cuerpo).
 * Mismo criterio fail-closed que OnvoCobroVerificador (C9): sin «mode» o con modo distinto al de la llave,
 * se rechaza. Montos de ONVO en unidad menor (céntimos); el plan guarda colones enteros.
 */
public final class OnvoBillingVerificador {

    static final long CENTIMOS_POR_COLON = 100L;

    private OnvoBillingVerificador() {}

    /** Resultado: {@code motivo == null} = aceptar. */
    public record Resultado(String motivo, String planNombre, LocalDate fechaFin) {
        public boolean aceptado() { return motivo == null; }
        static Resultado rechazo(String m) { return new Resultado(m, null, null); }
    }

    /** Resuelve el precio mensual (colones) de un plan por nombre; null si no existe. */
    @FunctionalInterface
    public interface PrecioPlan { Integer precio(String planNombre); }

    /** subscription.renewal.succeeded: renovación (invoice) pagada + suscripción activa, mismo modo, monto del plan. */
    public static Resultado renovacion(Map<?, ?> invoice, Map<?, ?> sub, String invoiceId, String subId,
                                       String modo, java.util.function.Function<String, String> planPorPrice,
                                       PrecioPlan precios) {
        if (!modoCoincide(invoice, modo) || !modoCoincide(sub, modo)) return Resultado.rechazo("modo");
        if (!igual(texto(invoice, "id"), invoiceId) || !igual(texto(sub, "id"), subId)) return Resultado.rechazo("id");
        // ONVO: la renovación tiene que traer subscriptionId y customerId y coincidir con la suscripción.
        if (!igual(texto(invoice, "subscriptionId"), subId)) return Resultado.rechazo("id");
        if (!igual(texto(invoice, "customerId"), texto(sub, "customerId"))) return Resultado.rechazo("customer");
        if (!"paid".equalsIgnoreCase(texto(invoice, "status"))) return Resultado.rechazo("no_pagado");
        if (!"active".equalsIgnoreCase(texto(sub, "status"))) return Resultado.rechazo("sub_no_activa");
        // B1: una factura con saldo pendiente no activa el plan. Sandbox ONVO: la factura no trae
        // amountRemaining/amountDue/amountPaid (se conservan por si aparecen); el pago real está en el
        // paymentIntent embebido de GET /invoices/{id}: status succeeded y receivedAmount >= total.
        if (invoice.get("paymentIntent") instanceof Map<?, ?> pi) {
            String st = texto(pi, "status");
            if (st != null && !"succeeded".equalsIgnoreCase(st)) return Resultado.rechazo("no_pagado");
            BigDecimal recibido = numero(pi.get("receivedAmount"));
            BigDecimal totalFactura = numero(invoice.get("total"));
            if (recibido != null && totalFactura != null && recibido.compareTo(totalFactura) < 0) {
                return Resultado.rechazo("pago_parcial");
            }
        }
        BigDecimal pendiente = numero(invoice.get("amountRemaining"));
        if (pendiente == null) pendiente = numero(invoice.get("amountDue"));
        BigDecimal pagado = numero(invoice.get("amountPaid"));
        BigDecimal total = numero(invoice.get("total"));
        if ((pendiente != null && pendiente.signum() > 0)
                || (pagado != null && total != null && pagado.compareTo(total) < 0)) {
            return Resultado.rechazo("pago_parcial");
        }
        return planYMonto(invoice, "total", sub, planPorPrice, precios,
            fecha(texto(invoice, "periodEnd")) != null ? fecha(texto(invoice, "periodEnd"))
                : fecha(texto(sub, "currentPeriodEnd")));
    }

    /**
     * payment-intent.succeeded del alta. Sandbox ONVO: el intent no trae subscriptionId ni customerId plano
     * (trae customer.id); el vínculo con la suscripción es la factura (paymentIntentId + subscriptionId).
     */
    public static Resultado altaPorIntent(Map<?, ?> intent, Map<?, ?> factura, Map<?, ?> sub,
                                          String intentId, String subId,
                                          String modo, java.util.function.Function<String, String> planPorPrice,
                                          PrecioPlan precios) {
        if (!modoCoincide(intent, modo) || !modoCoincide(sub, modo) || !modoCoincide(factura, modo)) {
            return Resultado.rechazo("modo");
        }
        if (!igual(texto(intent, "id"), intentId) || !igual(texto(sub, "id"), subId)) return Resultado.rechazo("id");
        if (!igual(texto(factura, "paymentIntentId"), intentId) || !igual(texto(factura, "subscriptionId"), subId)) {
            return Resultado.rechazo("id");
        }
        if (!"succeeded".equalsIgnoreCase(texto(intent, "status"))) return Resultado.rechazo("no_pagado");
        if (!"active".equalsIgnoreCase(texto(sub, "status"))) return Resultado.rechazo("sub_no_activa");
        String clienteSub = texto(sub, "customerId");
        if (!igual(texto(factura, "customerId"), clienteSub)) return Resultado.rechazo("customer");
        String clienteIntent = texto(intent, "customerId");
        if (clienteIntent == null && intent != null && intent.get("customer") instanceof Map<?, ?> c) {
            clienteIntent = texto(c, "id");
        }
        if (clienteIntent != null && !clienteIntent.equals(clienteSub)) return Resultado.rechazo("customer");
        // B1: el alta por intent cobra el plan completo; lo prorrateado entra por la factura (renewal).
        Resultado r = planYMonto(intent, "amount", sub, planPorPrice, precios, fecha(texto(sub, "currentPeriodEnd")));
        if (r.aceptado()) {
            BigDecimal monto = numero(intent.get("amount"));
            Integer precioPlan = precios.precio(r.planNombre());
            if (monto == null || precioPlan == null
                    || monto.compareTo(BigDecimal.valueOf(precioPlan.longValue() * CENTIMOS_POR_COLON)) != 0) {
                return Resultado.rechazo("pago_parcial");
            }
        }
        return r;
    }

    /** Falla/cancelación: solo se aplica si ONVO (por GET, mismo modo) reporta ese estado. */
    public static boolean estadoConfirmado(Map<?, ?> sub, String subId, String modo, String... estados) {
        if (!modoCoincide(sub, modo) || !igual(texto(sub, "id"), subId)) return false;
        String st = texto(sub, "status");
        for (String e : estados) if (e.equalsIgnoreCase(st)) return true;
        return false;
    }

    public static boolean modoCoincide(Map<?, ?> o, String modoEsperado) {
        if (modoEsperado == null || modoEsperado.isBlank()) return false;
        String m = texto(o, "mode");
        return m != null && m.equalsIgnoreCase(modoEsperado);
    }

    private static Resultado planYMonto(Map<?, ?> cobro, String campoMonto, Map<?, ?> sub,
                                        java.util.function.Function<String, String> planPorPrice,
                                        PrecioPlan precios, LocalDate fin) {
        if (cobro == null || sub == null) return Resultado.rechazo("sin_datos");
        if (!"CRC".equalsIgnoreCase(texto(cobro, "currency"))) return Resultado.rechazo("moneda");
        String plan = planPorPrice.apply(OnvoBillingClient.primerPriceId(sub));
        if (plan == null) return Resultado.rechazo("price_desconocido");
        Integer precio = precios.precio(plan);
        if (precio == null || precio <= 0) return Resultado.rechazo("plan_sin_precio");
        BigDecimal cobrado = numero(cobro.get(campoMonto));
        // La primera factura puede venir prorrateada (ONVO): 0 < total <= precio del plan.
        if (cobrado == null || cobrado.signum() <= 0
                || cobrado.compareTo(BigDecimal.valueOf(precio.longValue() * CENTIMOS_POR_COLON)) > 0) {
            return Resultado.rechazo("monto");
        }
        if (fin == null) return Resultado.rechazo("sin_periodo");
        return new Resultado(null, plan, fin);
    }

    static LocalDate fecha(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return Instant.parse(iso).atZone(Constants.ZONA_CR).toLocalDate();
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static boolean igual(String a, String b) {
        return a != null && b != null && a.equals(b);
    }

    static String texto(Map<?, ?> m, String campo) {
        Object v = m == null ? null : m.get(campo);
        if (v == null) return null;
        String s = String.valueOf(v);
        return s.isBlank() ? null : s.toLowerCase(Locale.ROOT).equals("null") ? null : s;
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
