package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.time.temporal.ChronoUnit;

/**
 * Ciclo de vida del trial del plan Emprendedor después del alta (el alta y el contador viven en
 * {@code CupoEmprendedorService}).
 *
 * <ul>
 *   <li>Durante el trial el negocio opera en TRIAL sin tarjeta.</li>
 *   <li>Cuando decide activar el cobro, {@link #diasRestantes} es el {@code trialPeriodDays} que se manda a ONVO:
 *       ONVO no cobra hasta que termina el trial y de ahí en adelante cobra US$9 cada mes en automático.</li>
 *   <li>Si el trial termina sin un cobro exitoso (sin tarjeta, o con tarjeta y cobro fallido) el negocio entra al
 *       flujo de impago del área 5: ver {@link #cerrarTrial}. Nunca se queda gratis.</li>
 * </ul>
 */
@Service
public class TrialEmprendedorService {

    private static final Logger log = LoggerFactory.getLogger(TrialEmprendedorService.class);

    private static final String ESTADO_PAST_DUE = "PAST_DUE";
    private static final String PLAN_EMPRENDEDOR = "EMPRENDEDOR";

    private final TrialEmprendedorRepository trialRepo;
    private final PlanRepository planRepo;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final CacheManager cacheManager;
    private final int diasGracia;

    public TrialEmprendedorService(TrialEmprendedorRepository trialRepo, EmpresaRepository empresaRepo,
                                   SuscripcionRepository suscripcionRepo, PlanRepository planRepo,
                                   CacheManager cacheManager,
                                   @Value("${hotclick.billing.dias-gracia:8}") int diasGracia) {
        this.trialRepo = trialRepo;
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.planRepo = planRepo;
        this.cacheManager = cacheManager;
        this.diasGracia = Math.max(0, diasGracia);
    }

    /** true si el negocio tomó un puesto de trial Emprendedor (aunque ya haya terminado). */
    public static boolean tuvoTrial(Empresa empresa) {
        return empresa != null && empresa.getTrialEmprendedorPos() != null;
    }

    /**
     * true si Emprendedor ya NO es gratis para este negocio: tomó puesto de trial, o entró sin cupo
     * (REQUIERE_MEMBRESIA). Esos negocios nunca «bajan a gratis»: pagan US$9 por ONVO.
     */
    public static boolean emprendedorEsDePago(Empresa empresa) {
        return tuvoTrial(empresa)
            || (empresa != null && (Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA.equals(empresa.getEstadoPlan())
                || Constants.ESTADO_PLAN_PENDIENTE_CUPO.equals(empresa.getEstadoPlan())));
    }

    /**
     * Días de trial que faltan (el {@code trialPeriodDays} para ONVO). 0 si no hubo trial, ya terminó o la fecha
     * falta: en ese caso el primer cobro es inmediato (nunca se regalan días de más).
     */
    public static int diasRestantes(Empresa empresa, LocalDate hoy) {
        if (!tuvoTrial(empresa) || empresa.getTrialEmprendedorHasta() == null) return 0;
        return (int) Math.max(0, ChronoUnit.DAYS.between(hoy, empresa.getTrialEmprendedorHasta()));
    }

    /** Ids de los negocios con trial Emprendedor vencido que siguen en TRIAL (una sola consulta). */
    public List<Long> idsTrialVencidos(LocalDate hoy) {
        return trialRepo.idsTrialVencidos(hoy);
    }

    /**
     * Cierra el trial de UN negocio en su propia transacción corta (el scheduler itera los ids; así un fallo no
     * revierte a los demás ni se mantiene una transacción larga). Devuelve true si hizo algún cambio.
     *
     * <p>Un trial que terminó sin cobro exitoso NO se queda gratis: entra al flujo de impago del área 5. El negocio
     * pasa a PAST_DUE y su {@code Suscripcion} queda PAST_DUE con {@code fechaFin = último día del trial}; a partir
     * de ahí el job diario {@code expirarPastDueVencidos} aplica la misma gracia ({@code hotclick.billing.dias-gracia}),
     * reconsulta a ONVO (si pagó, lo reactiva) y, si no, lo pasa a VENCIDO y SUSPENDIDO_IMPAGO. Vale igual sin tarjeta
     * (sin suscripción ONVO: se crea la fila local), con suscripción ONVO sin tarjeta y con tarjeta cuyo cobro falló.
     * También repara un negocio que ya quedó PAST_DUE por el webhook pero cuya fila no tiene {@code fechaFin}
     * (el job de impago nunca la elegiría). Si el cobro se confirma después, el webhook lo pasa a ACTIVO y lo reactiva.
     */
    @Transactional
    public boolean cerrarTrial(Long id, LocalDate hoy) {
        Empresa e = empresaRepo.findByIdForUpdate(id).orElse(null);
        // Releído con lock: si el webhook de cobro lo activó mientras tanto, no se toca.
        if (e == null || !tuvoTrial(e) || e.getTrialEmprendedorHasta() == null
            || !e.getTrialEmprendedorHasta().isBefore(hoy)) {
            return false;
        }
        boolean enTrial = Constants.ESTADO_PLAN_TRIAL.equals(e.getEstadoPlan());
        if (!enTrial && !ESTADO_PAST_DUE.equals(e.getEstadoPlan())) {
            return false;
        }
        LocalDate hasta = e.getTrialEmprendedorHasta();
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(id).orElse(null);
        if (sub != null && "ACTIVO".equals(sub.getEstado())) {
            return false; // hay un cobro confirmado: no se toca
        }
        if (sub == null) {
            sub = nuevaSuscripcionImpaga(e, hasta);
        }
        if (sub == null) {
            // Fail-closed: sin plan base no se puede abrir el flujo de impago; no se deja gratis.
            e.setEstadoPlan("VENCIDO");
            e.setFechaVencPlan(hoy);
            empresaRepo.save(e);
            evictTenant(id);
            log.error("[ALERTA-PAGO] trial vencido sin plan base para el flujo de impago, empresa={} queda VENCIDO", id);
            return true;
        }
        boolean cambioSub = !ESTADO_PAST_DUE.equals(sub.getEstado()) || sub.getFechaFin() == null
            || sub.getFechaFin().isAfter(hasta);
        if (!enTrial && !cambioSub) {
            return false; // ya está en el flujo de impago con fecha
        }
        sub.setEstado(ESTADO_PAST_DUE);
        if (sub.getFechaFin() == null || sub.getFechaFin().isAfter(hasta)) sub.setFechaFin(hasta);
        suscripcionRepo.save(sub);
        e.setEstadoPlan(ESTADO_PAST_DUE);
        e.setFechaVencPlan(hasta);
        empresaRepo.save(e);
        evictTenant(id);
        log.info("[trial-emprendedor] trial terminado sin cobro: empresa={} pasa a PAST_DUE (gracia {} día(s))", id, diasGracia);
        return true;
    }

    /** Fila local para que el área 5 vea al negocio sin tarjeta; null si falta el plan base. */
    private Suscripcion nuevaSuscripcionImpaga(Empresa e, LocalDate hasta) {
        Plan plan = planRepo.findByNombre(PLAN_EMPRENDEDOR).orElse(null);
        if (plan == null) return null;
        Suscripcion s = new Suscripcion();
        s.setEmpresa(e);
        s.setPlan(plan);
        s.setEstado(ESTADO_PAST_DUE);
        s.setFechaFin(hasta);
        return s;
    }

    private void evictTenant(Long empresaId) {
        Cache cache = cacheManager.getCache("tenantInfo");
        if (cache != null) cache.evict(empresaId);
    }
}
