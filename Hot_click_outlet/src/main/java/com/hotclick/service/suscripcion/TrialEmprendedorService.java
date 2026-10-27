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

    /** Ids de los negocios con trial Emprendedor vencido que siguen en TRIAL (una sola consulta). */
    public List<Long> idsTrialVencidos(LocalDate hoy) {
        return trialRepo.idsTrialVencidos(hoy);
    }

    /**
     * Cierra el trial de UN negocio en su propia transacción corta (el scheduler itera los ids; así un fallo no
     * revierte a los demás ni se mantiene una transacción larga). Devuelve true si pasó a VENCIDO.
     */
    @Transactional
    public boolean cerrarTrial(Long id, LocalDate hoy) {
        Empresa e = empresaRepo.findByIdForUpdate(id).orElse(null);
        // Releído con lock: si el webhook de cobro lo activó mientras tanto, no se toca.
        if (e == null || !Constants.ESTADO_PLAN_TRIAL.equals(e.getEstadoPlan()) || !tuvoTrial(e)
            || e.getTrialEmprendedorHasta() == null || !e.getTrialEmprendedorHasta().isBefore(hoy)) {
            return false;
        }
        boolean conCobroOnvo = tieneSuscripcionOnvo(id);
        if (conCobroOnvo && !e.getTrialEmprendedorHasta().plusDays(diasGracia).isBefore(hoy)) {
            return false; // dentro de la gracia: esperando el webhook del primer cobro
        }
        e.setEstadoPlan("VENCIDO");
        e.setFechaVencPlan(hoy);
        empresaRepo.save(e);
        evictTenant(id);
        log.info("[trial-emprendedor] trial vencido empresa={} conCobroOnvo={}", id, conCobroOnvo);
        return true;
    }

    private boolean tieneSuscripcionOnvo(Long empresaId) {
        var sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        return sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank();
    }

    private void evictTenant(Long empresaId) {
        Cache cache = cacheManager.getCache("tenantInfo");
        if (cache != null) cache.evict(empresaId);
    }
}
