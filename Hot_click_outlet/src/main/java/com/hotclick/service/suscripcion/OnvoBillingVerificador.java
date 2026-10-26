package com.hotclick.service.suscripcion;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lectura de objetos ONVO devueltos por GET. Nombres y valores según https://docs.onvopay.com/openapi.yaml:
 * <ul>
 *   <li>Subscription (l.3601): status ∈ active|past_due|canceled|unpaid|incomplete|incomplete_expired|trialing,
 *       customerId, items[] de SubscriptionItem (l.3945: id, priceId, quantity), latestInvoice (Invoice).</li>
 *   <li>Invoice / renovación (l.3751): id, status ∈ draft|open|paid|void|uncollectible, total (centavos),
 *       currency, subscriptionId, customerId, paymentIntentId, periodStart/periodEnd (l.3843/3848, ISO 8601 UTC).
 *       Se lee por id con GET /v1/invoices/{id} (l.7768).</li>
 *   <li>Subscription.currentPeriodStart/End (l.3657/3662, ISO 8601 UTC).</li>
 *   <li>PaymentIntent: status "succeeded" (igual que OnvoService.java:215 y OnvoCobroVerificador.java:28).</li>
 * </ul>
 */
final class OnvoBillingVerificador {

    static final Set<String> SUB_EN_MORA = Set.of("past_due", "unpaid");
    static final Set<String> SUB_TERMINADA = Set.of("canceled", "incomplete_expired");

    private OnvoBillingVerificador() {}

    static String estado(Map<?, ?> obj) {
        String st = texto(obj, "status");
        return st == null ? null : st.toLowerCase();
    }

    static boolean suscripcionActiva(Map<?, ?> sub) { return "active".equals(estado(sub)); }

    static boolean facturaPagada(Map<?, ?> inv) { return "paid".equals(estado(inv)); }

    static boolean intentExitoso(Map<?, ?> pi) { return "succeeded".equals(estado(pi)); }

    /** Única línea de la suscripción (los planes SaaS tienen un solo precio, cantidad 1). */
    static Map<?, ?> unicoItem(Map<?, ?> sub) {
        Object items = sub == null ? null : sub.get("items");
        if (items instanceof List<?> l && l.size() == 1 && l.get(0) instanceof Map<?, ?> m) {
            BigDecimal q = numero(m.get("quantity"));
            if (q == null || q.compareTo(BigDecimal.ONE) == 0) return m;
        }
        return null;
    }

    static String priceId(Map<?, ?> sub) {
        Map<?, ?> item = unicoItem(sub);
        return item == null ? null : texto(item, "priceId");
    }

    /** Renovación embebida en la suscripción (Subscription.latestInvoice). */
    static Map<?, ?> ultimaFactura(Map<?, ?> sub) {
        Object li = sub == null ? null : sub.get("latestInvoice");
        return li instanceof Map<?, ?> m ? m : null;
    }

    /** Invoice.total en centavos. */
    static BigDecimal total(Map<?, ?> inv) { return inv == null ? null : numero(inv.get("total")); }

    /** Monto en centavos y moneda CRC iguales al precio mensual (colones) del plan. */
    static boolean coincide(Integer precioMensualColones, BigDecimal centavos, String moneda) {
        if (precioMensualColones == null || centavos == null || moneda == null) return false;
        if (!"CRC".equalsIgnoreCase(moneda)) return false;
        return centavos.compareTo(BigDecimal.valueOf(precioMensualColones.longValue() * 100L)) == 0;
    }

    static String texto(Map<?, ?> m, String campo) {
        if (m == null) return null;
        Object v = m.get(campo);
        if (v == null) return null;
        String s = String.valueOf(v);
        return s.isBlank() ? null : s;
    }

    static BigDecimal numero(Object v) {
        if (v instanceof Number n) return new BigDecimal(n.toString());
        if (v instanceof String s && !s.isBlank()) {
            try { return new BigDecimal(s.trim()); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    /**
     * R-1: la renovación es la vigente si es la latestInvoice de la sub, o si su período coincide con el período
     * actual de la sub (currentPeriodStart/End). Sin uno de los dos, no es vigente.
     */
    static boolean esRenovacionVigente(Map<?, ?> sub, Map<?, ?> inv) {
        String invId = texto(inv, "id");
        Map<?, ?> ultima = ultimaFactura(sub);
        if (invId != null && ultima != null && invId.equals(texto(ultima, "id"))) return true;
        java.time.Instant ps = instante(texto(inv, "periodStart"));
        java.time.Instant pe = instante(texto(inv, "periodEnd"));
        java.time.Instant cs = instante(texto(sub, "currentPeriodStart"));
        java.time.Instant ce = instante(texto(sub, "currentPeriodEnd"));
        return ps != null && pe != null && ps.equals(cs) && pe.equals(ce);
    }

    static java.time.Instant instante(String iso) {
        if (iso == null) return null;
        try {
            return java.time.OffsetDateTime.parse(iso).toInstant();
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }
    }

    /** Fecha en Costa Rica de un instante ISO 8601 de ONVO; null si falta o no se puede leer. */
    static java.time.LocalDate fechaCr(String iso) {
        java.time.Instant i = instante(iso);
        return i == null ? null : i.atZone(com.hotclick.utils.Constants.ZONA_CR).toLocalDate();
    }
}
