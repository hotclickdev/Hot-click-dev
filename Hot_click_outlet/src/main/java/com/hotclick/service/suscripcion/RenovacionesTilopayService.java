package com.hotclick.service.suscripcion;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.CobroSuscripcion;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.CobroSuscripcionRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.billing.BillingLedgerWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Día de cobro de Tilopay: a cada suscripción de pago con fecha_fin hoy o antes le abre un cobro de
 * RENOVACION (si no tiene uno pendiente) y la pasa a PAST_DUE hasta que pague.
 * SCALE1: una lectura de suscripciones (con plan y empresa), una de cobros pendientes para todos los
 * negocios y la escritura en lote; nada se consulta por negocio dentro del recorrido.
 */
@Service
public class RenovacionesTilopayService {

    private static final Logger log = LoggerFactory.getLogger(RenovacionesTilopayService.class);

    private final SuscripcionRepository suscripcionRepo;
    private final CobroSuscripcionRepository cobroRepo;
    private final SuscripcionTilopayService suscripciones;
    private final BillingLedgerWriter ledgerWriter;

    public RenovacionesTilopayService(SuscripcionRepository suscripcionRepo, CobroSuscripcionRepository cobroRepo,
                                      SuscripcionTilopayService suscripciones, BillingLedgerWriter ledgerWriter) {
        this.suscripcionRepo = suscripcionRepo;
        this.cobroRepo = cobroRepo;
        this.suscripciones = suscripciones;
        this.ledgerWriter = ledgerWriter;
    }

    @Transactional
    public int generarRenovaciones(LocalDate hoy) {
        List<Suscripcion> vencidas = new ArrayList<>();
        for (Suscripcion sub : suscripcionRepo.findVigentesConPlanYEmpresa()) {
            if (vence(sub, hoy)) vencidas.add(sub);
        }
        if (vencidas.isEmpty()) return 0;
        Set<Long> empresas = new HashSet<>();
        for (Suscripcion sub : vencidas) empresas.add(sub.getEmpresa().getId());
        Set<Long> conPendiente = new HashSet<>(cobroRepo.empresasConCobro(
            CobroSuscripcion.PENDIENTE, CobroSuscripcion.MOTIVO_RENOVACION, empresas));

        List<CobroSuscripcion> cobros = new ArrayList<>();
        List<Suscripcion> pastDue = new ArrayList<>();
        for (Suscripcion sub : vencidas) {
            Long empresaId = sub.getEmpresa().getId();
            if (conPendiente.add(empresaId)) {
                // Cobro de planes por Tilopay prohibido: no se genera cobro de renovación (TODO: ONVO).
                log.warn("[ALERTA-PAGO] renovación sin cobro: Tilopay deshabilitado para planes empresa={} plan={}",
                    empresaId, sub.getPlan() != null ? sub.getPlan().getNombre() : null);
            }
            if ("ACTIVO".equals(sub.getEstado())) {
                sub.setEstado("PAST_DUE");
                pastDue.add(sub);
            }
        }
        suscripciones.guardarRenovaciones(cobros, pastDue);
        for (Suscripcion sub : pastDue) {
            ledgerWriter.registrar(sub.getEmpresa(), sub, BillingLedger.TIPO_COBRO_FALLIDO,
                BillingLedger.PROVEEDOR_TILOPAY, "renov-" + sub.getId() + "-" + hoy, null, "crc",
                "Mensualidad pendiente de pago");
        }
        if (!cobros.isEmpty()) log.info("[billing-tilopay] {} cobro(s) de renovación generados", cobros.size());
        return cobros.size();
    }

    static boolean vence(Suscripcion sub, LocalDate hoy) {
        Plan plan = sub.getPlan();
        if (plan == null || plan.getPrecioMensual() == null || plan.getPrecioMensual() <= 0) return false;
        if (sub.getFechaFin() == null || sub.getFechaFin().isAfter(hoy)) return false;
        if (!"ACTIVO".equals(sub.getEstado()) && !"PAST_DUE".equals(sub.getEstado())) return false;
        return !Boolean.TRUE.equals(sub.getCancelarAlVencer());
    }
}
