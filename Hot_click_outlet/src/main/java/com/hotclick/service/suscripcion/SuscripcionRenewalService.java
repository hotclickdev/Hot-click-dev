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

    /**
     * Auditor 5 S-01: solo se degrada por impago si existe una forma real de pagar la mensualidad
     * (ONVO con llave, no mock ni deshabilitado). Fail-closed: ante la duda, no se quita el plan.
     */
    boolean hayCobroDisponible() {
        return onvoBilling != null && !onvoBilling.sinLlave() && !onvoBilling.isMockMode()
            && !onvoBilling.isBillingDeshabilitado();
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

    /** Días de gracia tras una mensualidad impaga (12-oct-2026: 7). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.billing.dias-gracia:7}")
    private int diasGracia;

    /** Expira PAST_DUE cuya fecha_fin + días de gracia ya pasó → degrada a FREE. */
    @Transactional
    public int expirarPastDueVencidos() {
        // La consulta compara fecha_fin < límite: con gracia, el límite se corre N días hacia atrás.
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        if (!hayCobroDisponible()) {
            log.warn("[billing] PAST_DUE no se degradan: no hay cobro de mensualidades disponible (ONVO sin configurar)");
            return 0;
        }
        LocalDate limite = hoy.minusDays(Math.max(0, diasGracia));
        List<Long> empresaIds = suscripcionRepo.findEmpresaIdsPastDueVencidos(limite);
        if (empresaIds.isEmpty()) return 0;

        int n = suscripcionRepo.expirarPastDueBatch(limite);
        planSupport.degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} PAST_DUE expirado(s) — {} empresa(s) degradadas", n, empresaIds.size());
        return n;
    }
}
