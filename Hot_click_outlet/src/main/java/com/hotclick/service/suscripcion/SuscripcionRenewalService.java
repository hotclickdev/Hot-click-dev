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
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepo;
    @Autowired private OnvoRenovacionReconsulta reconsulta;

    /** Días de gracia tras una mensualidad impaga (26-oct-2026: 8; el día 8 todavía vende). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.billing.dias-gracia:8}")
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
        int max = Math.max(1, maxBajasPorCorrida);
        reconsulta.iniciarCorrida();
        // 26-oct-2026: ya no se difiere a corridas siguientes; se procesan todos los vencidos en lotes
        // de tamaño max para que el día 9 se cumpla para todas las tiendas. Tope duro anti-bucle.
        // A5-01: las filas que ONVO reactivó o que no se pudieron verificar quedan PAST_DUE y se excluyen del resto de la corrida.
        java.util.Set<Long> omitidas = new java.util.HashSet<>();
        int total = 0;
        for (int vuelta = 0; vuelta < 10_000; vuelta++) {
            int[] r = expirarLote(hoy, limite, max, omitidas);
            if (r[0] == 0) break;
            total += r[1];
        }
        return total;
    }

    /** Un lote: marca VENCIDO, degrada el plan y suspende la tienda. Devuelve {candidatos, bajas}; candidatos 0 = no quedan. */
    private int[] expirarLote(LocalDate hoy, LocalDate limite, int max, java.util.Set<Long> omitidas) {
        List<com.hotclick.model.Suscripcion> lote = candidatos(limite, max, omitidas);
        if (lote.isEmpty()) return new int[] {0, 0};
        // Seguridad MEDIO (carrera con el webhook ONVO): UPDATE atómico condicional por fila
        // (estado='PAST_DUE'); solo se degradan las empresas cuya fila realmente pasó a VENCIDO.
        List<Long> empresaIds = new java.util.ArrayList<>();
        for (com.hotclick.model.Suscripcion s : lote) {
            if (!confirmadaSinPago(s, hoy)) {
                omitidas.add(s.getId());
            } else if (suscripcionRepo.marcarVencidoSiPastDue(s.getId()) == 1) {
                empresaIds.add(s.getEmpresa().getId());
            }
        }
        if (!empresaIds.isEmpty()) {
            planSupport.degradarPlanBatchConCache(empresaIds, hoy);
            // Día 9: tienda oculta y sin ventas. Los datos no se tocan; al pagar vuelve a ACTIVO.
            empresaRepo.suspenderPorImpagoBatch(empresaIds);
        }
        log.info("[billing] {} PAST_DUE expirado(s) y suspendido(s) de {} candidato(s) (lote {}, {} omitida(s))",
            empresaIds.size(), lote.size(), max, omitidas.size());
        // Las filas que ganó el webhook ya no son PAST_DUE y no vuelven a salir en el lote siguiente.
        return new int[] {lote.size(), empresaIds.size()};
    }

    /**
     * A5-01: ONVO (GET) manda. Con suscripción ONVO solo se da de baja si ONVO confirma que no hay pago vigente;
     * si pagó se reactiva y si el GET falla no se toca. Los heredados (sin onvoSubscriptionId) siguen igual.
     */
    private boolean confirmadaSinPago(com.hotclick.model.Suscripcion s, LocalDate hoy) {
        if (s.getOnvoSubscriptionId() == null || s.getOnvoSubscriptionId().isBlank()) return true;
        return reconsulta.reconsultar(s, hoy) == OnvoRenovacionReconsulta.Estado.NO_PAGADA;
    }

    private List<com.hotclick.model.Suscripcion> candidatos(LocalDate limite, int max, java.util.Set<Long> omitidas) {
        List<com.hotclick.model.Suscripcion> lote = new java.util.ArrayList<>();
        for (com.hotclick.model.Suscripcion s : suscripcionRepo.findPastDueOnvoVencidos(
                limite, org.springframework.data.domain.PageRequest.of(0, max + omitidas.size()))) {
            if (!omitidas.contains(s.getId()) && lote.size() < max) lote.add(s);
        }
        // PAST_DUE heredados de Tilopay/Stripe (sin onvoSubscriptionId): completan el cupo del mismo lote.
        if (lote.size() < max) {
            for (com.hotclick.model.Suscripcion s : suscripcionRepo.findPastDueLegadoVencidos(
                    limite, org.springframework.data.domain.PageRequest.of(0, max - lote.size() + omitidas.size()))) {
                if (!omitidas.contains(s.getId()) && lote.size() < max) lote.add(s);
            }
        }
        return lote;
    }
}
