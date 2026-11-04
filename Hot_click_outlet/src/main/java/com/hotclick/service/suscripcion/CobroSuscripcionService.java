package com.hotclick.service.suscripcion;

import com.hotclick.model.CobroSuscripcion;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.CobroSuscripcionRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cobros de mensualidad (tabla de cobros de suscripción), neutral de pasarela: escritura en lote de las renovaciones,
 * cálculo del próximo día de cobro y el aviso «Completá el pago» de un plan elegido sin pagar.
 */
@Service
public class CobroSuscripcionService {

    /** Días que el aviso «Completá el pago» sigue visible tras elegir un plan de pago sin pagarlo. */
    static final long DIAS_AVISO_PLAN_PENDIENTE = 7;

    private final CobroSuscripcionRepository cobroRepo;
    private final PlanRepository planRepo;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;

    public CobroSuscripcionService(CobroSuscripcionRepository cobroRepo, PlanRepository planRepo,
                                   EmpresaRepository empresaRepo, SuscripcionRepository suscripcionRepo) {
        this.cobroRepo = cobroRepo;
        this.planRepo = planRepo;
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
    }

    /** Escritura en lote de una corrida de renovaciones (dos sentencias batch, no una por negocio). */
    @Transactional
    public void guardarRenovaciones(List<CobroSuscripcion> cobros, List<Suscripcion> pasanAPastDue) {
        if (!cobros.isEmpty()) cobroRepo.saveAll(cobros);
        if (!pasanAPastDue.isEmpty()) suscripcionRepo.saveAll(pasanAPastDue);
    }

    /** Próxima fecha de cobro con el día del negocio (13 o 28), al menos ~un mes después de hoy. */
    public static LocalDate proximoCobro(LocalDate hoy, int dia) {
        LocalDate esteMes = hoy.withDayOfMonth(Math.min(dia, hoy.lengthOfMonth()));
        LocalDate siguiente = esteMes.plusMonths(1);
        return siguiente.withDayOfMonth(Math.min(dia, siguiente.lengthOfMonth()));
    }

    /**
     * Plan nuevo elegido y no pagado (cobro de ALTA pendiente, reciente, distinto del plan actual).
     * Solo dice qué plan falta pagar; el pago se abre desde la pantalla de planes.
     */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> planNuevoPendiente(Long empresaId) {
        Optional<CobroSuscripcion> cobro = cobroRepo.findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
            empresaId, CobroSuscripcion.PENDIENTE, CobroSuscripcion.MOTIVO_ALTA);
        if (cobro.isEmpty()) return Optional.empty();
        Plan plan = planRepo.findById(cobro.get().getPlanId()).orElse(null);
        Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
        String planActual = empresa == null ? null
            : empresa.getPlan() != null ? empresa.getPlan().getNombre() : empresa.getPlanSaas();
        if (!avisarPlanPendiente(cobro.get().getFechaCreacion(), LocalDateTime.now(Constants.ZONA_CR),
                plan == null ? null : plan.getNombre(), planActual)) {
            return Optional.empty();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("plan", plan.getNombre());
        m.put("motivo", CobroSuscripcion.MOTIVO_ALTA);
        return Optional.of(m);
    }

    static boolean avisarPlanPendiente(LocalDateTime creado, LocalDateTime ahora, String planPendiente, String planActual) {
        if (planPendiente == null || creado == null) return false;
        if (creado.isBefore(ahora.minusDays(DIAS_AVISO_PLAN_PENDIENTE))) return false;
        return planActual == null || !planActual.equalsIgnoreCase(planPendiente);
    }
}
