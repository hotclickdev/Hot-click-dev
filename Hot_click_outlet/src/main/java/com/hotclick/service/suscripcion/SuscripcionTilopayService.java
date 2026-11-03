package com.hotclick.service.suscripcion;

import com.hotclick.model.*;
import com.hotclick.repository.CobroSuscripcionRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.TilopayService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Mensualidades de plan con Tilopay (reemplaza ONVO, decisión HOT_CLICK).
 * Tilopay no maneja la recurrencia: HotClick genera un cobro por periodo (día 28 o 13 de cada negocio),
 * el negocio paga con el SDK embebido y el backend confirma consultando a Tilopay (monto, CRC y orden).
 * Impago → PAST_DUE; tras los días de gracia el job existente degrada el plan y suspende la tienda (SUSPENDIDO_IMPAGO).
 */
@Service
public class SuscripcionTilopayService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionTilopayService.class);

    private final CobroSuscripcionRepository cobroRepo;
    private final PlanRepository planRepo;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final TilopayService tilopayService;
    private final PlanPagoConfirmado planLocal;
    private final BillingLedgerWriter ledgerWriter;
    private final int diaCobroDefault;
    private final String prorrateo;

    public SuscripcionTilopayService(CobroSuscripcionRepository cobroRepo, PlanRepository planRepo,
                                     EmpresaRepository empresaRepo, SuscripcionRepository suscripcionRepo,
                                     TilopayService tilopayService, PlanPagoConfirmado planLocal,
                                     BillingLedgerWriter ledgerWriter,
                                     @Value("${hotclick.billing.dia-cobro-default:28}") int diaCobroDefault,
                                     @Value("${hotclick.billing.prorrateo:DIAS}") String prorrateo) {
        this.prorrateo = prorrateo;
        this.cobroRepo = cobroRepo;
        this.planRepo = planRepo;
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.tilopayService = tilopayService;
        this.planLocal = planLocal;
        this.ledgerWriter = ledgerWriter;
        this.diaCobroDefault = diaCobroDefault;
    }

    /** Cambio de plan: gratis se aplica ya; de pago devuelve los datos para abrir el SDK de Tilopay. */
    @Transactional
    public Map<String, Object> iniciarCambioPlan(Long empresaId, Long planId) {
        Plan plan = planRepo.findById(planId).orElseThrow(() -> new NoSuchElementException("Plan no encontrado"));
        if (Boolean.FALSE.equals(plan.getActivo())) {
            throw new IllegalArgumentException("Plan no disponible");
        }
        // ESC-5: plan sin precio definido por HOT_CLICK (null) → no se cobra ni se inventa monto.
        if (plan.getPrecioMensual() == null) throw new com.hotclick.exception.PlanNoDisponibleException();
        long precio = plan.getPrecioMensual().longValue();
        Map<String, Object> r = new LinkedHashMap<>();
        // Seguridad: un precio 0 o negativo NUNCA activa el plan sin cobro (antes: SIN_COBRO). Responde 409 PLAN_SIN_PRECIO.
        if (precio <= 0) throw new com.hotclick.exception.PlanSinPrecioException(plan.getNombre());
        // Cobro de planes por Tilopay prohibido (ni real ni mock). Fail-closed: no se crea cobro ni token SDK,
        // el plan pedido no se activa. TODO: cobro por ONVO.
        log.warn("[ALERTA-PAGO] cobro de plan bloqueado (Tilopay deshabilitado para planes) empresa={} plan={}",
            empresaId, plan.getNombre());
        throw new com.hotclick.exception.CobroPlanNoDisponibleException(plan.getNombre());
    }

    CobroSuscripcion crearCobro(Long empresaId, Plan plan, String motivo) {
        return cobroRepo.save(nuevoCobro(empresaId, plan, motivo, diaCobro(empresaId)));
    }

    /** Arma el cobro sin guardarlo; el día de cobro lo pasa quien ya tiene la empresa cargada. */
    CobroSuscripcion nuevoCobro(Long empresaId, Plan plan, String motivo, int dia) {
        CobroSuscripcion c = new CobroSuscripcion();
        c.setEmpresaId(empresaId);
        c.setPlanId(plan.getId());
        long precio = plan.getPrecioMensual().longValue();
        c.setMontoCrc(CobroSuscripcion.MOTIVO_ALTA.equals(motivo)
            ? ProrrateoSuscripcion.montoAlta(prorrateo, precio, c.getFechaCreacion().toLocalDate(), dia)
            : precio);
        c.setMotivo(motivo);
        c.setOrderNumber("SUB-" + empresaId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT));
        return c;
    }

    /** Escritura en lote de una corrida de renovaciones (dos sentencias batch, no una por negocio). */
    @Transactional
    public void guardarRenovaciones(List<CobroSuscripcion> cobros, List<Suscripcion> pasanAPastDue) {
        if (!cobros.isEmpty()) cobroRepo.saveAll(cobros);
        if (!pasanAPastDue.isEmpty()) suscripcionRepo.saveAll(pasanAPastDue);
    }

    int diaDe(Empresa empresa) {
        return empresa != null && empresa.getDiaCobro() != null ? empresa.getDiaCobro() : diaCobroDefault;
    }

    /** Confirma con Tilopay (nunca con lo que diga el navegador) y activa/renueva el plan. */
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> confirmar(Long empresaId, String orderNumber) {
        CobroSuscripcion cobro = cobroRepo.findByOrderNumberAndEmpresaId(orderNumber, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cobro no encontrado"));
        if (cobro != null) {
            // Ningún cobro de plan se confirma por Tilopay (ni su mock): no activa el plan.
            log.warn("[ALERTA-PAGO] confirmación Tilopay de plan bloqueada empresa={} order={}", empresaId, orderNumber);
            throw new com.hotclick.exception.CobroPlanNoDisponibleException(null);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        if (CobroSuscripcion.PAGADO.equals(cobro.getEstado())) {
            r.put("estado", "ACTIVO");
            return r;
        }
        if (!CobroSuscripcion.PENDIENTE.equals(cobro.getEstado())) {
            throw new IllegalStateException("El cobro ya no está pendiente");
        }
        TilopayService.ConsultaResultado consulta = tilopayService.consultarTransaccion(orderNumber);
        if (!aceptable(cobro, consulta, tilopayService.isMockMode())) {
            log.warn("[billing-tilopay] Cobro {} no confirmado empresa={} code={}", orderNumber, empresaId,
                consulta != null ? consulta.code() : null);
            r.put("estado", "NO_CONFIRMADO");
            return r;
        }
        cobro.setEstado(CobroSuscripcion.PAGADO);
        cobro.setAutorizacion(consulta.auth());
        cobro.setFechaPago(LocalDateTime.now(Constants.ZONA_CR));
        cobroRepo.save(cobro);
        activarPeriodo(empresaId, cobro);
        r.put("estado", "ACTIVO");
        return r;
    }

    static boolean aceptable(CobroSuscripcion cobro, TilopayService.ConsultaResultado c, boolean mockMode) {
        if (c == null || !c.aprobada()) return false;
        if (c.simulada()) return mockMode;
        return c.amount() != null && c.amount().compareTo(BigDecimal.valueOf(cobro.getMontoCrc())) == 0
            && c.currency() != null && "CRC".equalsIgnoreCase(c.currency().trim())
            && c.orderNumber() != null && cobro.getOrderNumber().equals(c.orderNumber().trim());
    }

    private void activarPeriodo(Long empresaId, CobroSuscripcion cobro) {
        Plan plan = planRepo.findById(cobro.getPlanId()).orElseThrow();
        planLocal.planPagoConfirmado(empresaId, plan.getNombre(), Constants.PROVEEDOR_TILOPAY, cobro.getOrderNumber());
        Empresa empresa = empresaRepo.findById(empresaId).orElseThrow();
        int dia = empresa.getDiaCobro() != null ? empresa.getDiaCobro() : diaCobroDefault;
        // El alta prorrateada cubre hasta el próximo día de cobro, contado desde que se creó el cobro.
        LocalDate fin = CobroSuscripcion.MOTIVO_ALTA.equals(cobro.getMotivo())
            ? ProrrateoSuscripcion.finPrimerPeriodo(prorrateo, cobro.getFechaCreacion().toLocalDate(), dia)
            : proximoCobro(LocalDate.now(Constants.ZONA_CR), dia);
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseThrow();
        sub.setFechaFin(fin);
        suscripcionRepo.save(sub);
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        ledgerWriter.registrar(empresa, sub, BillingLedger.TIPO_COBRO_OK, BillingLedger.PROVEEDOR_TILOPAY,
            cobro.getOrderNumber(), null, "crc", "Mensualidad " + plan.getNombre() + " pagada con Tilopay");
    }

    private int diaCobro(Long empresaId) {
        return diaDe(empresaRepo.findById(empresaId).orElse(null));
    }

    /** Próxima fecha de cobro con el día del negocio (13 o 28), al menos ~un mes después de hoy. */
    public static LocalDate proximoCobro(LocalDate hoy, int dia) {
        LocalDate esteMes = hoy.withDayOfMonth(Math.min(dia, hoy.lengthOfMonth()));
        LocalDate siguiente = esteMes.plusMonths(1);
        return siguiente.withDayOfMonth(Math.min(dia, siguiente.lengthOfMonth()));
    }

    /** Cobro de renovación pendiente para mostrar "Pagar mensualidad" en el panel. */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> pendiente(Long empresaId) {
        Optional<CobroSuscripcion> cobro = cobroRepo.findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
            empresaId, CobroSuscripcion.PENDIENTE, CobroSuscripcion.MOTIVO_RENOVACION);
        if (cobro.isEmpty()) return Optional.empty();
        // Hay mensualidad pendiente, pero no se abre el SDK de Tilopay para pagarla: fail-closed.
        log.warn("[ALERTA-PAGO] pago de renovación por Tilopay bloqueado empresa={} order={}",
            empresaId, cobro.get().getOrderNumber());
        throw new com.hotclick.exception.CobroPlanNoDisponibleException(null);
    }

    /** Días que el aviso «Completá el pago» sigue visible tras elegir un plan de pago sin pagarlo. */
    static final long DIAS_AVISO_PLAN_PENDIENTE = 7;

    /**
     * Plan nuevo elegido y no pagado (cobro de ALTA pendiente, reciente, distinto del plan actual).
     * Neutral de pasarela: solo dice qué plan falta pagar; el pago se abre desde la pantalla de planes.
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
