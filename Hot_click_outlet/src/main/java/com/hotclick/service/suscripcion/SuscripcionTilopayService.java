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
 * Impago → PAST_DUE; tras los días de gracia el job existente degrada a EMPRENDEDOR.
 */
@Service
public class SuscripcionTilopayService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionTilopayService.class);

    private final CobroSuscripcionRepository cobroRepo;
    private final PlanRepository planRepo;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final TilopayService tilopayService;
    private final SuscripcionOnvoChangeService planLocal;
    private final BillingLedgerWriter ledgerWriter;
    private final int diaCobroDefault;

    public SuscripcionTilopayService(CobroSuscripcionRepository cobroRepo, PlanRepository planRepo,
                                     EmpresaRepository empresaRepo, SuscripcionRepository suscripcionRepo,
                                     TilopayService tilopayService, SuscripcionOnvoChangeService planLocal,
                                     BillingLedgerWriter ledgerWriter,
                                     @Value("${hotclick.billing.dia-cobro-default:28}") int diaCobroDefault) {
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
        if (precio <= 0) {
            planLocal.aplicarPlanLocal(empresaId, plan.getNombre(), null);
            r.put("estado", "ACTIVO");
            r.put("plan", plan.getNombre());
            return r;
        }
        CobroSuscripcion cobro = crearCobro(empresaId, plan, CobroSuscripcion.MOTIVO_ALTA);
        r.put("estado", "PENDIENTE_PAGO");
        r.put("proveedor", Constants.PROVEEDOR_TILOPAY);
        r.put("orderNumber", cobro.getOrderNumber());
        r.put("montoCrc", cobro.getMontoCrc());
        r.put("moneda", "CRC");
        r.put("sdkToken", tilopayService.loginSdk());
        r.put("plan", plan.getNombre());
        return r;
    }

    CobroSuscripcion crearCobro(Long empresaId, Plan plan, String motivo) {
        CobroSuscripcion c = new CobroSuscripcion();
        c.setEmpresaId(empresaId);
        c.setPlanId(plan.getId());
        c.setMontoCrc(plan.getPrecioMensual().longValue());
        c.setMotivo(motivo);
        c.setOrderNumber("SUB-" + empresaId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        return cobroRepo.save(c);
    }

    /** Confirma con Tilopay (nunca con lo que diga el navegador) y activa/renueva el plan. */
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> confirmar(Long empresaId, String orderNumber) {
        CobroSuscripcion cobro = cobroRepo.findByOrderNumberAndEmpresaId(orderNumber, empresaId)
            .orElseThrow(() -> new NoSuchElementException("Cobro no encontrado"));
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
        planLocal.aplicarPlanLocal(empresaId, plan.getNombre(), null);
        Empresa empresa = empresaRepo.findById(empresaId).orElseThrow();
        LocalDate fin = proximoCobro(LocalDate.now(Constants.ZONA_CR),
            empresa.getDiaCobro() != null ? empresa.getDiaCobro() : diaCobroDefault);
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseThrow();
        sub.setFechaFin(fin);
        suscripcionRepo.save(sub);
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        ledgerWriter.registrar(empresa, sub, BillingLedger.TIPO_COBRO_OK, BillingLedger.PROVEEDOR_TILOPAY,
            cobro.getOrderNumber(), null, "crc", "Mensualidad " + plan.getNombre() + " pagada con Tilopay");
    }

    /** Próxima fecha de cobro con el día del negocio (13 o 28), al menos ~un mes después de hoy. */
    public static LocalDate proximoCobro(LocalDate hoy, int dia) {
        LocalDate esteMes = hoy.withDayOfMonth(Math.min(dia, hoy.lengthOfMonth()));
        LocalDate siguiente = esteMes.plusMonths(1);
        return siguiente.withDayOfMonth(Math.min(dia, siguiente.lengthOfMonth()));
    }

    /**
     * Día de cobro: a cada suscripción de pago con fecha_fin hoy o antes le abre un cobro de RENOVACION
     * (si no tiene uno pendiente) y la pasa a PAST_DUE hasta que pague.
     */
    @Transactional
    public int generarRenovaciones(LocalDate hoy) {
        int n = 0;
        for (Suscripcion sub : suscripcionRepo.findVigentesConPlanYEmpresa()) {
            Plan plan = sub.getPlan();
            if (plan == null || plan.getPrecioMensual() == null || plan.getPrecioMensual() <= 0) continue;
            if (sub.getFechaFin() == null || sub.getFechaFin().isAfter(hoy)) continue;
            if (!"ACTIVO".equals(sub.getEstado()) && !"PAST_DUE".equals(sub.getEstado())) continue;
            Long empresaId = sub.getEmpresa().getId();
            if (Boolean.TRUE.equals(sub.getCancelarAlVencer())) continue;
            if (cobroRepo.findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
                    empresaId, CobroSuscripcion.PENDIENTE, CobroSuscripcion.MOTIVO_RENOVACION).isEmpty()) {
                crearCobro(empresaId, plan, CobroSuscripcion.MOTIVO_RENOVACION);
                n++;
            }
            if ("ACTIVO".equals(sub.getEstado())) {
                sub.setEstado("PAST_DUE");
                suscripcionRepo.save(sub);
                ledgerWriter.registrar(sub.getEmpresa(), sub, BillingLedger.TIPO_COBRO_FALLIDO,
                    BillingLedger.PROVEEDOR_TILOPAY, "renov-" + sub.getId() + "-" + hoy, null, "crc",
                    "Mensualidad pendiente de pago");
            }
        }
        if (n > 0) log.info("[billing-tilopay] {} cobro(s) de renovación generados", n);
        return n;
    }

    /** Cobro de renovación pendiente para mostrar "Pagar mensualidad" en el panel. */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> pendiente(Long empresaId) {
        return cobroRepo.findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(
                empresaId, CobroSuscripcion.PENDIENTE, CobroSuscripcion.MOTIVO_RENOVACION)
            .map(c -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("orderNumber", c.getOrderNumber());
                m.put("montoCrc", c.getMontoCrc());
                m.put("moneda", "CRC");
                m.put("proveedor", Constants.PROVEEDOR_TILOPAY);
                m.put("sdkToken", tilopayService.loginSdk());
                return m;
            });
    }
}
