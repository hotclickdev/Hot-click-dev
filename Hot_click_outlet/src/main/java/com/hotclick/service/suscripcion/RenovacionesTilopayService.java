package com.hotclick.service.suscripcion;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.CobroSuscripcion;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.CobroSuscripcionRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.billing.BillingLedgerWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final OnvoRenovacionReconsulta reconsulta;
    private final SecurityAuditService auditoria;

    public RenovacionesTilopayService(SuscripcionRepository suscripcionRepo, CobroSuscripcionRepository cobroRepo,
                                      SuscripcionTilopayService suscripciones, BillingLedgerWriter ledgerWriter,
                                      OnvoRenovacionReconsulta reconsulta, SecurityAuditService auditoria) {
        this.reconsulta = reconsulta;
        this.auditoria = auditoria;
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
        reconsulta.iniciarCorrida(OnvoRenovacionReconsulta.Corrida.GENERAR_RENOVACIONES);
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
            if ("ACTIVO".equals(sub.getEstado()) && puedePasarAPastDue(sub, hoy)) {
                sub.setEstado("PAST_DUE");
                pastDue.add(sub);
            }
        }
        suscripciones.guardarRenovaciones(cobros, pastDue);
        for (Suscripcion sub : pastDue) {
            String proveedor = proveedorDeCobro(sub);
            // Moneda real del cobro: ONVO la toma de la configuración de planes, Tilopay cobra en colones.
            String moneda = BillingLedger.PROVEEDOR_ONVO.equals(proveedor)
                ? reconsulta.monedaConfigurada().orElse(null) : "crc";
            if (moneda == null) {
                omitirAsientoSinMoneda(sub, proveedor, hoy);
                continue;
            }
            ledgerWriter.registrar(sub.getEmpresa(), sub, BillingLedger.TIPO_COBRO_FALLIDO,
                proveedor, "renov-" + sub.getId() + "-" + hoy, null, moneda,
                "Mensualidad pendiente de pago");
        }
        if (!cobros.isEmpty()) log.info("[billing-tilopay] {} cobro(s) de renovación generados", cobros.size());
        return cobros.size();
    }

    /**
     * Sin moneda no se escribe el asiento (nunca una moneda inventada), pero la omisión NO queda solo en el log:
     * se persiste un registro de auditoría (REQUIRES_NEW, sobrevive a cualquier rollback) para que operaciones
     * pueda conciliar. La suscripción ya quedó en PAST_DUE (no se regala servicio) y el job no se rompe.
     */
    private void omitirAsientoSinMoneda(Suscripcion sub, String proveedor, LocalDate hoy) {
        Long empresaId = sub.getEmpresa().getId();
        log.error("[ALERTA-PAGO] Ledger renovación ONVO sin moneda configurada, asiento omitido y auditado empresa={} sub={}",
            empresaId, sub.getId());
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("tipo", BillingLedger.TIPO_COBRO_FALLIDO);
        meta.put("proveedor", proveedor);
        meta.put("empresaId", empresaId);
        meta.put("suscripcionId", sub.getId());
        meta.put("fecha", hoy.toString());
        meta.put("motivo", "falta PLANES_MONEDA");
        meta.put("estadoSuscripcion", sub.getEstado());
        try {
            auditoria.log(SecurityEventType.BILLING_LEDGER_OMITIDO, SecurityEventSeverity.HIGH, null, null, null, null,
                "job:renovaciones", meta);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] No se pudo auditar la omisión del asiento empresa={} sub={}", empresaId, sub.getId());
        }
    }

    /** El ledger registra el proveedor que cobra la suscripción: ONVO si tiene id de ONVO, Tilopay si es heredada. */
    static String proveedorDeCobro(Suscripcion sub) {
        String onvoId = sub.getOnvoSubscriptionId();
        return onvoId != null && !onvoId.isBlank() ? BillingLedger.PROVEEDOR_ONVO : BillingLedger.PROVEEDOR_TILOPAY;
    }

    /**
     * A5-01: una suscripción ONVO solo pasa a PAST_DUE si ONVO (GET) confirma que no hay pago vigente.
     * Pagada → ya quedó reactivada; incierta (GET falló) → se deja como está y se reintenta en la próxima corrida.
     */
    private boolean puedePasarAPastDue(Suscripcion sub, LocalDate hoy) {
        if (sub.getOnvoSubscriptionId() == null || sub.getOnvoSubscriptionId().isBlank()) return true;
        return reconsulta.reconsultar(sub, hoy, OnvoRenovacionReconsulta.Corrida.GENERAR_RENOVACIONES) == OnvoRenovacionReconsulta.Estado.NO_PAGADA;
    }

    static boolean vence(Suscripcion sub, LocalDate hoy) {
        Plan plan = sub.getPlan();
        if (plan == null || plan.getPrecioMensual() == null || plan.getPrecioMensual() <= 0) return false;
        if (sub.getFechaFin() == null || sub.getFechaFin().isAfter(hoy)) return false;
        if (!"ACTIVO".equals(sub.getEstado()) && !"PAST_DUE".equals(sub.getEstado())) return false;
        return !Boolean.TRUE.equals(sub.getCancelarAlVencer());
    }
}
