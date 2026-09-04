package com.hotclick.service.billing;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaSaas;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mapeo puro de entidades de billing a DTOs de consola admin.
 */
public final class AdminBillingMapper {

    public static final long EMPRESA_PLATAFORMA_ID = 1L;
    public static final String PROVEEDOR_NINGUNO = "NINGUNO";
    public static final String PROVEEDOR_ONVO = "ONVO";
    public static final String PROVEEDOR_STRIPE = "STRIPE";
    public static final String PROVEEDOR_AMBOS = "AMBOS";

    private AdminBillingMapper() {}

    public static boolean esEmpresaPlataforma(Empresa e) {
        if (e == null) return false;
        if (e.getId() != null && e.getId() == EMPRESA_PLATAFORMA_ID) return true;
        return e.getSlug() != null && "hotclick".equalsIgnoreCase(e.getSlug());
    }

    public static String detectarProveedor(Suscripcion sub) {
        if (sub == null) return PROVEEDOR_NINGUNO;
        boolean onvo = tieneId(sub.getOnvoSubscriptionId());
        boolean stripe = tieneId(sub.getStripeSubscriptionId())
            && !sub.getStripeSubscriptionId().startsWith("sub_mock");
        if (onvo && stripe) return PROVEEDOR_AMBOS;
        if (onvo) return PROVEEDOR_ONVO;
        if (stripe) return PROVEEDOR_STRIPE;
        return PROVEEDOR_NINGUNO;
    }

    public static Map<String, Object> filaLista(Empresa e, Suscripcion sub, long fallosCobro) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId", e.getId());
        m.put("nombre", nombreVisible(e));
        m.put("slug", e.getSlug());
        m.put("estadoEmpresa", e.getEstadoEmpresa());
        m.put("plan", nombrePlan(e, sub));
        m.put("comisionPorcentaje", comisionDe(e, sub));
        m.put("precioMensual", precioMensualDe(e, sub));
        m.put("estadoSuscripcion", sub != null ? sub.getEstado() : "SIN_SUSCRIPCION");
        m.put("estadoPlan", e.getEstadoPlan());
        m.put("proveedor", detectarProveedor(sub));
        m.put("fechaVencPlan", e.getFechaVencPlan());
        m.put("fallosCobro", fallosCobro);
        m.put("alertaCobro", "PAST_DUE".equals(sub != null ? sub.getEstado() : null)
            || "PAST_DUE".equals(e.getEstadoPlan())
            || fallosCobro > 0);
        return m;
    }

    public static Map<String, Object> detalleSuscripcion(Suscripcion sub) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (sub == null) {
            m.put("estado", "SIN_SUSCRIPCION");
            m.put("proveedor", PROVEEDOR_NINGUNO);
            return m;
        }
        m.put("id", sub.getId());
        m.put("estado", sub.getEstado());
        m.put("proveedor", detectarProveedor(sub));
        m.put("fechaInicio", sub.getFechaInicio());
        m.put("fechaFin", sub.getFechaFin());
        m.put("trialEnd", sub.getTrialEnd());
        m.put("cancelarAlVencer", sub.getCancelarAlVencer());
        m.put("onvoCustomerId", sub.getOnvoCustomerId());
        m.put("onvoSubscriptionId", sub.getOnvoSubscriptionId());
        m.put("stripeCustomerId", sub.getStripeCustomerId());
        m.put("stripeSubscriptionId", sub.getStripeSubscriptionId());
        if (sub.getPlan() != null) {
            m.put("planId", sub.getPlan().getId());
            m.put("planNombre", sub.getPlan().getNombre());
        }
        return m;
    }

    public static Map<String, Object> mapaFactura(FacturaSaas f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("stripeInvoiceId", f.getStripeInvoiceId());
        m.put("montoCentavos", f.getMontoCentavos());
        m.put("moneda", f.getMoneda());
        m.put("estado", f.getEstado());
        m.put("periodoInicio", f.getPeriodoInicio());
        m.put("periodoFin", f.getPeriodoFin());
        m.put("urlPdf", f.getUrlPdf());
        m.put("fechaCreacion", f.getFechaCreacion());
        return m;
    }

    public static Map<String, Object> mapaLedger(BillingLedger l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("tipo", l.getTipo());
        m.put("proveedor", l.getProveedor());
        m.put("referenciaExterna", l.getReferenciaExterna());
        m.put("montoCentavos", l.getMontoCentavos());
        m.put("moneda", l.getMoneda());
        m.put("detalle", l.getDetalle());
        m.put("fechaEvento", l.getFechaEvento());
        return m;
    }

    public static Map<String, Object> kpisDeFilas(List<Map<String, Object>> filas) {
        long pastDue = filas.stream().filter(AdminBillingMapper::esPastDue).count();
        long alerta = filas.stream().filter(f -> Boolean.TRUE.equals(f.get("alertaCobro"))).count();
        long onvo = filas.stream().filter(f -> proveedorIncluye(f, PROVEEDOR_ONVO)).count();
        long stripe = filas.stream().filter(f -> proveedorIncluye(f, PROVEEDOR_STRIPE)).count();
        return Map.of(
            "total", filas.size(),
            "pastDue", pastDue,
            "conAlertaCobro", alerta,
            "conOnvo", onvo,
            "conStripe", stripe
        );
    }

    static boolean esPastDue(Map<String, Object> fila) {
        return "PAST_DUE".equals(fila.get("estadoSuscripcion"))
            || "PAST_DUE".equals(fila.get("estadoPlan"));
    }

    private static boolean proveedorIncluye(Map<String, Object> fila, String proveedor) {
        String p = String.valueOf(fila.get("proveedor"));
        return proveedor.equals(p) || PROVEEDOR_AMBOS.equals(p);
    }

    static String nombreVisible(Empresa e) {
        if (e.getNombreComercial() != null && !e.getNombreComercial().isBlank()) {
            return e.getNombreComercial();
        }
        return e.getNombreEmpresa();
    }

    static String nombrePlan(Empresa e, Suscripcion sub) {
        if (sub != null && sub.getPlan() != null && sub.getPlan().getNombre() != null) {
            return sub.getPlan().getNombre();
        }
        if (e.getPlan() != null && e.getPlan().getNombre() != null) {
            return e.getPlan().getNombre();
        }
        return e.getPlanSaas() != null ? e.getPlanSaas() : "EMPRENDEDOR";
    }

    static BigDecimal comisionDe(Empresa e, Suscripcion sub) {
        Plan p = planDe(e, sub);
        return p != null && p.getComisionPorcentaje() != null
            ? p.getComisionPorcentaje()
            : BigDecimal.ZERO;
    }

    static Integer precioMensualDe(Empresa e, Suscripcion sub) {
        Plan p = planDe(e, sub);
        return p != null ? p.getPrecioMensual() : 0;
    }

    private static Plan planDe(Empresa e, Suscripcion sub) {
        if (sub != null && sub.getPlan() != null) return sub.getPlan();
        return e.getPlan();
    }

    private static boolean tieneId(String id) {
        return id != null && !id.isBlank();
    }
}
