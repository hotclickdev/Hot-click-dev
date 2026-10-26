package com.hotclick.service.suscripcion;

import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class SuscripcionRenewalService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionRenewalService.class);

    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private SuscripcionPlanSupport planSupport;
    @Autowired private com.hotclick.service.onvo.OnvoBillingClient onvoBilling;

    /** Días de gracia tras una mensualidad impaga (12-oct-2026: 7). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.billing.dias-gracia:7}")
    private int diasGracia;

    /**
     * Auditor 5 S-01: solo se degrada por impago si existe una forma real de pagar la mensualidad
     * (ONVO con llave, no mock ni deshabilitado). Fail-closed: ante la duda, no se quita el plan.
     */
    boolean hayCobroDisponible() {
        return onvoBilling != null && !onvoBilling.sinLlave() && !onvoBilling.isMockMode()
            && !onvoBilling.isBillingDeshabilitado();
    }

    /** Auditor 5 S-03: cancelaciones al vencer (cancelarAlVencer) cuyo período terminó → plan base. */
    @Transactional
    public int cerrarCancelacionesVencidas() {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        List<Long> empresaIds = suscripcionRepo.findEmpresaIdsCanceladasVencidas(hoy);
        if (empresaIds.isEmpty()) return 0;
        int n = suscripcionRepo.cerrarCanceladasVencidasBatch(hoy);
        planSupport.degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} cancelación(es) al vencer cerradas — {} empresa(s) a plan base", n, empresaIds.size());
        return n;
    }

    /** Expira trials vencidos → degrada a FREE. Llamado por BillingRenewalScheduler. */
    @Transactional
    public int expirarTrialsVencidos() {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        // Leer IDs antes del batch update para poder evictar el cache después
        List<Long> empresaIds = suscripcionRepo.findEmpresaIdsTrialsVencidos(hoy);
        if (empresaIds.isEmpty()) return 0;

        int n = suscripcionRepo.expirarTrialsBatch(hoy);
        planSupport.degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} trial(s) expirado(s) — {} empresa(s) degradadas", n, empresaIds.size());
        return n;
    }


    /** Gracia escalonada: máximo de bajas por impago por corrida diaria (las más viejas primero). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.billing.max-bajas-por-corrida:25}")
    private int maxBajasPorCorrida = 25;

    /**
     * Expira PAST_DUE cuya fecha_fin + días de gracia ya pasó → degrada a FREE.
     * Auditor 5 S-01: en pausa si no hay forma de pagar. Seguridad B1: solo suscripciones ONVO.
     * Gracia escalonada: al activar la llave live no se dan de baja todos los acumulados de una vez.
     */
    @Transactional
    public int expirarPastDueVencidos() {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        LocalDate limite = hoy.minusDays(Math.max(0, diasGracia));
        if (!hayCobroDisponible()) {
            // Seguridad B2: visibilidad de lo que se acumula durante la pausa.
            log.warn("[billing] Baja por impago en pausa (sin cobro ONVO): {} PAST_DUE vencido(s) sin bajar",
                suscripcionRepo.countPastDueVencidos(limite));
            return 0;
        }
        List<com.hotclick.model.Suscripcion> lote = suscripcionRepo.findPastDueOnvoVencidos(
            limite, org.springframework.data.domain.PageRequest.of(0, Math.max(1, maxBajasPorCorrida)));
        if (lote.isEmpty()) return 0;
        List<Long> empresaIds = new java.util.ArrayList<>();
        for (com.hotclick.model.Suscripcion s : lote) {
            s.setEstado("VENCIDO");
            empresaIds.add(s.getEmpresa().getId());
        }
        suscripcionRepo.saveAll(lote);
        planSupport.degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} PAST_DUE expirado(s) (lote máx {}) — {} empresa(s) degradadas",
            lote.size(), maxBajasPorCorrida, empresaIds.size());
        return lote.size();
    }
}
