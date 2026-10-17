package com.hotclick.service.negocio;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * S4-24 (lectura, Frontend #181): «Mi plan y mensualidad» del negocio. Solo lee lo que ya existe
 * (plan, estado del plan, vencimiento y pausa de la tienda); no pasa por Tilopay ni llama a ONVO.
 * Los montos salen del plan; si no hay plan, van en null (nunca se inventan).
 */
@Service
public class MensualidadNegocioService {

    public static final String ACTIVO = "ACTIVO";
    public static final String PENDIENTE_PAGO = "PENDIENTE_PAGO";
    public static final String EN_GRACIA = "EN_GRACIA";

    /** Estados de plan que significan mensualidad sin pagar. */
    static final Set<String> PLAN_SIN_PAGAR = Set.of("VENCIDO", "PAST_DUE");

    private final EmpresaRepository empresaRepository;

    public MensualidadNegocioService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> mensualidad(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Plan plan = e.getPlan();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("plan", plan != null ? plan.getNombre() : e.getPlanSaas());
        m.put("estado", estado(e));
        m.put("monto", plan != null ? plan.getPrecioMensual() : null);
        m.put("fecha", e.getFechaVencPlan() != null ? e.getFechaVencPlan().toString() : null);
        m.put("porcentaje", plan != null ? plan.getComisionPorcentaje() : null);
        m.put("minimoComision", plan != null ? plan.getComisionMinimaCrc() : null);
        return m;
    }

    /**
     * EN_GRACIA no se devuelve todavía: los días de gracia son decisión del dueño. Mientras tanto, una
     * mensualidad sin pagar (plan VENCIDO / PAST_DUE o tienda pausada) es PENDIENTE_PAGO.
     */
    static String estado(Empresa e) {
        if (e.isTiendaPausada()) return PENDIENTE_PAGO;
        if (e.getEstadoPlan() != null && PLAN_SIN_PAGAR.contains(e.getEstadoPlan())) return PENDIENTE_PAGO;
        return ACTIVO;
    }
}
