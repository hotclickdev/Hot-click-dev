package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
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
import java.time.temporal.ChronoUnit;

/**
 * Ciclo de vida del trial del plan Emprendedor después del alta (el alta y el contador viven en
 * {@code CupoEmprendedorService}).
 *
 * <ul>
 *   <li>Durante el trial el negocio opera en TRIAL sin tarjeta.</li>
 *   <li>Cuando decide activar el cobro, {@link #diasRestantes} es el {@code trialPeriodDays} que se manda a ONVO:
 *       ONVO no cobra hasta que termina el trial y de ahí en adelante cobra US$9 cada mes en automático.</li>
 *   <li>Si el trial termina sin suscripción ONVO, el job diario lo pasa a VENCIDO (fail-closed: sin cobro no hay
 *       plan). Si ya hay suscripción ONVO se espera el webhook de cobro (que lo pasa a ACTIVO) durante la gracia de
 *       billing y solo entonces se cierra.</li>
 * </ul>
 */
@Service
public class TrialEmprendedorService {

    private static final Logger log = LoggerFactory.getLogger(TrialEmprendedorService.class);

    private final TrialEmprendedorRepository trialRepo;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final CacheManager cacheManager;
    private final int diasGracia;

    public TrialEmprendedorService(TrialEmprendedorRepository trialRepo, EmpresaRepository empresaRepo,
                                   SuscripcionRepository suscripcionRepo, CacheManager cacheManager,
                                   @Value("${hotclick.billing.dias-gracia:8}") int diasGracia) {
        this.trialRepo = trialRepo;
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
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
            || (empresa != null && Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA.equals(empresa.getEstadoPlan()));
    }

    /**
     * Días de trial que faltan (el {@code trialPeriodDays} para ONVO). 0 si no hubo trial, ya terminó o la fecha
     * falta: en ese caso el primer cobro es inmediato (nunca se regalan días de más).
     */
    public static int diasRestantes(Empresa empresa, LocalDate hoy) {
        if (!tuvoTrial(empresa) || empresa.getTrialEmprendedorHasta() == null) return 0;
        return (int) Math.max(0, ChronoUnit.DAYS.between(hoy, empresa.getTrialEmprendedorHasta()));
    }

    /** Cierra los trials vencidos. Devuelve cuántos negocios pasaron a VENCIDO. */
    @Transactional
    public int cerrarTrialsVencidos(LocalDate hoy) {
        int cerrados = 0;
        for (Long id : trialRepo.idsTrialVencidos(hoy)) {
            Empresa e = empresaRepo.findByIdForUpdate(id).orElse(null);
            // Releído con lock: si el webhook de cobro lo activó mientras tanto, no se toca.
            if (e == null || !Constants.ESTADO_PLAN_TRIAL.equals(e.getEstadoPlan()) || !tuvoTrial(e)
                || e.getTrialEmprendedorHasta() == null || !e.getTrialEmprendedorHasta().isBefore(hoy)) {
                continue;
            }
            boolean conCobroOnvo = suscripcionRepo.findActivaByEmpresaId(id)
                .map(s -> s.getOnvoSubscriptionId() != null && !s.getOnvoSubscriptionId().isBlank())
                .orElse(false);
            if (conCobroOnvo && !e.getTrialEmprendedorHasta().plusDays(diasGracia).isBefore(hoy)) {
                continue; // dentro de la gracia: esperando el webhook del primer cobro
            }
            e.setEstadoPlan("VENCIDO");
            e.setFechaVencPlan(hoy);
            empresaRepo.save(e);
            evictTenant(id);
            cerrados++;
            log.info("[trial-emprendedor] trial vencido empresa={} conCobroOnvo={}", id, conCobroOnvo);
        }
        return cerrados;
    }

    private void evictTenant(Long empresaId) {
        Cache cache = cacheManager.getCache("tenantInfo");
        if (cache != null) cache.evict(empresaId);
    }
}
