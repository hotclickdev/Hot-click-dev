package com.hotclick.service.contacto;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;

import java.util.Locale;
import java.util.Set;

/**
 * Regla de negocio: el visitante solo ve canales de contacto directo del vendedor (WhatsApp, Instagram,
 * teléfono, correo) si el negocio paga un plan PYME o NEGOCIO_PLUS. En EMPRENDEDOR (y sin plan) la venta
 * fuera de HotClick pierde la comisión, así que la API pública no los entrega.
 * Los nombres salen de {@code hot_click_plan_tb.nombre} / {@code Empresa.planSaas}.
 */
public final class ContactoPublicoPolicy {

    public static final Set<String> PLANES_CON_CONTACTO = Set.of("PYME", "NEGOCIO_PLUS");

    /** WhatsApp de HotClick: reemplaza al del vendedor donde la plataforma necesita un número. */
    public static final String WHATSAPP_HOTCLICK = "50686667888";

    private ContactoPublicoPolicy() {}

    /**
     * Mismo criterio que el cobro de comisión: primero el Plan estructurado, después {@code planSaas}.
     * El plan es LAZY: llamar dentro de una transacción (o usar {@link ContactoPublicoService}).
     */
    public static String nombrePlanEfectivo(Empresa empresa) {
        if (empresa == null) return null;
        Plan plan = empresa.getPlan();
        if (plan != null && plan.getNombre() != null) return plan.getNombre();
        return empresa.getPlanSaas();
    }

    public static boolean permiteContacto(Empresa empresa) {
        return permiteContacto(nombrePlanEfectivo(empresa));
    }

    /** Por defecto niega: plan nulo, vacío o desconocido no muestra contacto. */
    public static boolean permiteContacto(String nombrePlan) {
        if (nombrePlan == null || nombrePlan.isBlank()) return false;
        return PLANES_CON_CONTACTO.contains(nombrePlan.trim().toUpperCase(Locale.ROOT));
    }
}
