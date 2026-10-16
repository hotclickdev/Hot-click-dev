package com.hotclick.service.suscripcion;

import com.hotclick.exception.PasarelaNoDisponibleException;
import com.hotclick.exception.PlanNoDisponibleException;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Cambio de plan, neutral respecto de la pasarela. Un plan gratis se aplica de inmediato; un plan de pago
 * solo se activa cuando la pasarela confirma el cobro. Mientras no haya
 * pasarela conectada (ONVO marketplace pendiente) el plan de pago se rechaza con
 * {@link PasarelaNoDisponibleException}: nunca se activa sin pago ni se cae a otra pasarela.
 */
@Service
public class SuscripcionCambioPlanService {

    private final PlanRepository planRepo;
    private final SuscripcionOnvoChangeService planLocal;

    public SuscripcionCambioPlanService(PlanRepository planRepo, SuscripcionOnvoChangeService planLocal) {
        this.planRepo = planRepo;
        this.planLocal = planLocal;
    }

    @Transactional
    public Map<String, Object> iniciarCambioPlan(Long empresaId, Long planId) {
        Plan plan = planRepo.findById(planId).orElseThrow(() -> new NoSuchElementException("Plan no encontrado"));
        if (Boolean.FALSE.equals(plan.getActivo())) {
            throw new IllegalArgumentException("Plan no disponible");
        }
        // ESC-5: plan sin precio definido por HOT_CLICK (null) → no se cobra ni se inventa monto.
        if (plan.getPrecioMensual() == null) throw new PlanNoDisponibleException();
        if (plan.getPrecioMensual().longValue() > 0) throw new PasarelaNoDisponibleException();
        planLocal.aplicarPlanLocal(empresaId, plan.getNombre(), null);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("estado", "ACTIVO");
        r.put("plan", plan.getNombre());
        return r;
    }

    /** Próxima fecha de cobro con el día del negocio (13 o 28), al menos ~un mes después de hoy. */
    public static LocalDate proximoCobro(LocalDate hoy, int dia) {
        LocalDate esteMes = hoy.withDayOfMonth(Math.min(dia, hoy.lengthOfMonth()));
        LocalDate siguiente = esteMes.plusMonths(1);
        return siguiente.withDayOfMonth(Math.min(dia, siguiente.lengthOfMonth()));
    }
}
