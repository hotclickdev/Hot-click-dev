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
 * se rechaza. Montos de ONVO en unidad menor (centavos). Moneda y monto esperados salen del price configurado del
 * plan ({@link PrecioPlan}); el verificador no fija ninguna moneda ni monto.
 */
public final class OnvoBillingVerificador {

    private static final String M_CUSTOMER = "customer";
    private static final String M_NO_PAGADO = "no_pagado";
    private static final String M_SUB_NO_ACTIVA = "sub_no_activa";
    private static final String M_PAGO_PARCIAL = "pago_parcial";
    /** Falta configuración (moneda, precio del plan o price ids): motivo TRANSITORIO, nunca permanente. */
    public static final String M_CONFIG_FALTANTE = "config_faltante";
    private static final String F_STATUS = "status";
    private static final String F_TOTAL = "total";
    private static final String F_CUSTOMER_ID = "customerId";
    private static final String F_SUBSCRIPTION_ID = "subscriptionId";

    private OnvoBillingVerificador() {}

    /** Resultado: {@code motivo == null} = aceptar. */
    public record Resultado(String motivo, String planNombre, LocalDate fechaFin) {
        public boolean aceptado() { return motivo == null; }
        static Resultado rechazo(String m) { return new Resultado(m, null, null); }
    }

    /** Moneda (ISO, como la configura el plan) y monto en unidad menor que ONVO tiene que cobrar por el plan. */
    public record PrecioEsperado(String moneda, long unidadMenor) {}

    /** Resuelve el precio esperado de un plan y su price de ONVO; null si no se puede confirmar. */
    @FunctionalInterface
    public interface PrecioPlan { PrecioEsperado precio(String planNombre, String priceId); }

    /** subscription.renewal.succeeded: renovación (invoice) pagada + suscripción activa, mismo modo, monto del plan. */
    public static Resultado renovacion(Map<?, ?> invoice, Map<?, ?> sub, String invoiceId, String subId,
                                       String modo, java.util.function.Function<String, String> planPorPrice,
                                       PrecioPlan precios) {
        if (!modoCoincide(invoice, modo) || !modoCoincide(sub, modo)) return Resultado.rechazo("modo");
        if (!igual(texto(invoice, "id"), invoiceId) || !igual(texto(sub, "id"), subId)) return Resultado.rechazo("id");
        // ONVO: la renovación tiene que traer subscriptionId y customerId y coincidir con la suscripción.
        if (!igual(texto(invoice, F_SUBSCRIPTION_ID), subId)) return Resultado.rechazo("id");
        if (!igual(texto(invoice, F_CUSTOMER_ID), texto(sub, F_CUSTOMER_ID))) return Resultado.rechazo(M_CUSTOMER);
        if (!"paid".equalsIgnoreCase(texto(invoice, F_STATUS))) return Resultado.rechazo(M_NO_PAGADO);
        if (!"active".equalsIgnoreCase(texto(sub, F_STATUS))) return Resultado.rechazo(M_SUB_NO_ACTIVA);
        String parcial = motivoPagoIncompleto(invoice);
        if (parcial != null) return Resultado.rechazo(parcial);
        LocalDate fin = fecha(texto(invoice, "periodEnd"));
        if (fin == null) fin = fecha(texto(sub, "currentPeriodEnd"));
        return planYMonto(invoice, F_TOTAL, sub, planPorPrice, precios, fin);
    }

    /**
     * B1: una factura con saldo pendiente no activa el plan. Sandbox ONVO: la factura no trae
     * amountRemaining/amountDue/amountPaid (se conservan por si aparecen); el pago real está en el
     * paymentIntent embebido de GET /invoices/{id}: status succeeded y receivedAmount >= total.
     */
    private static String motivoPagoIncompleto(Map<?, ?> invoice) {
        BigDecimal total = numero(invoice.get(F_TOTAL));
        if (invoice.get("paymentIntent") instanceof Map<?, ?> pi) {
            String st = texto(pi, F_STATUS);
            if (st != null && !"succeeded".equalsIgnoreCase(st)) return M_NO_PAGADO;
            BigDecimal recibido = numero(pi.get("receivedAmount"));
            if (menor(recibido, total)) return M_PAGO_PARCIAL;
        }
        BigDecimal pendiente = numero(invoice.get("amountRemaining"));
        if (pendiente == null) pendiente = numero(invoice.get("amountDue"));
        if (pendiente != null && pendiente.signum() > 0) return M_PAGO_PARCIAL;
        return menor(numero(invoice.get("amountPaid")), total) ? M_PAGO_PARCIAL : null;
    }

    private static boolean menor(BigDecimal a, BigDecimal b) {
        return a != null && b != null && a.compareTo(b) < 0;
    }

    /** Objetos de ONVO (por GET) que intervienen en el alta por payment intent. */
    public record AltaObjetos(Map<?, ?> intent, Map<?, ?> factura, Map<?, ?> sub) {}

    /**
     * payment-intent.succeeded del alta. Sandbox ONVO: el intent no trae subscriptionId ni customerId plano
     * (trae customer.id); el vínculo con la suscripción es la factura (paymentIntentId + subscriptionId).
     */
    public static Resultado altaPorIntent(AltaObjetos o, String intentId, String subId,
                                          String modo, java.util.function.Function<String, String> planPorPrice,
                                          PrecioPlan precios) {
        Map<?, ?> intent = o.intent();
        Map<?, ?> factura = o.factura();
        Map<?, ?> sub = o.sub();
        if (!modoCoincide(intent, modo) || !modoCoincide(sub, modo) || !modoCoincide(factura, modo)) {
            return Resultado.rechazo("modo");
        }
        if (!igual(texto(intent, "id"), intentId) || !igual(texto(sub, "id"), subId)
                || !igual(texto(factura, "paymentIntentId"), intentId)
                || !igual(texto(factura, F_SUBSCRIPTION_ID), subId)) {
            return Resultado.rechazo("id");
        }
        if (!"succeeded".equalsIgnoreCase(texto(intent, F_STATUS))) return Resultado.rechazo(M_NO_PAGADO);
        if (!"active".equalsIgnoreCase(texto(sub, F_STATUS))) return Resultado.rechazo(M_SUB_NO_ACTIVA);
        String clienteSub = texto(sub, F_CUSTOMER_ID);
        String clienteIntent = clienteDelIntent(intent);
        if (!igual(texto(factura, F_CUSTOMER_ID), clienteSub)
                || (clienteIntent != null && !clienteIntent.equals(clienteSub))) {
            return Resultado.rechazo(M_CUSTOMER);
        }
        // El alta por intent cobra el plan completo (moneda y monto del price configurado); lo prorrateado entra por la factura.
        String monedaFactura = texto(factura, "currency");
        Resultado r = planYMonto(intent, "amount", sub, planPorPrice, precios, fecha(texto(sub, "currentPeriodEnd")));
        if (r.aceptado() && monedaFactura != null && !monedaFactura.equalsIgnoreCase(texto(intent, "currency"))) {
            return Resultado.rechazo("moneda");
        }
        return r;
    }

    /** customerId plano si existe; si no, customer.id (forma real del payment intent en ONVO). */
    private static String clienteDelIntent(Map<?, ?> intent) {
        String plano = texto(intent, F_CUSTOMER_ID);
        if (plano != null) return plano;
        Object cliente = intent == null ? null : intent.get(M_CUSTOMER);
        return cliente instanceof Map<?, ?> c ? texto(c, "id") : null;
    }

    /** Falla/cancelación: solo se aplica si ONVO (por GET, mismo modo) reporta ese estado. */
    public static boolean estadoConfirmado(Map<?, ?> sub, String subId, String modo, String... estados) {
        if (!modoCoincide(sub, modo) || !igual(texto(sub, "id"), subId)) return false;
        String st = texto(sub, F_STATUS);
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
        String priceId = OnvoBillingClient.primerPriceId(sub);
        String plan;
        PrecioEsperado esperado;
        try {
            plan = planPorPrice.apply(priceId);
            if (plan == null) return Resultado.rechazo("price_desconocido");
            esperado = precios.precio(plan, priceId);
        } catch (ConfigBillingFaltanteException e) {
            // Configuración faltante: transitorio (no está en PERMANENTES), no se pierde un pago ya cobrado.
            return Resultado.rechazo(M_CONFIG_FALTANTE);
        }
        if (esperado == null || esperado.moneda() == null || esperado.moneda().isBlank() || esperado.unidadMenor() <= 0) {
            return Resultado.rechazo("plan_sin_precio");
        }
        // La moneda del cobro tiene que ser la del price configurado; otra moneda no se compara por monto.
        if (!esperado.moneda().equalsIgnoreCase(texto(cobro, "currency"))) return Resultado.rechazo("moneda");
        BigDecimal cobrado = numero(cobro.get(campoMonto));
        // Se exige el monto COMPLETO del price configurado. Un cobro menor (prorrateo, descuento, parcial) no activa el
        // plan completo; mayor tampoco: no coincide con el catálogo.
        if (cobrado == null || cobrado.signum() <= 0) return Resultado.rechazo("monto");
        int cmp = cobrado.compareTo(BigDecimal.valueOf(esperado.unidadMenor()));
        if (cmp < 0) return Resultado.rechazo(M_PAGO_PARCIAL);
        if (cmp > 0) return Resultado.rechazo("monto");
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
