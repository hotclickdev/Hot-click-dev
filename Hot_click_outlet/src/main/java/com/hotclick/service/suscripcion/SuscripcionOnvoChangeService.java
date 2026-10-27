package com.hotclick.service.suscripcion;

import com.hotclick.exception.EmpresaPendienteAprobacionException;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Self-service de cambio de plan SaaS cobrado con ONVO.
 * El plan de la empresa solo se activa cuando el webhook confirma el pago
 * (excepto modo mock, que aplica al instante).
 */
@Service
public class SuscripcionOnvoChangeService implements PlanPagoConfirmado {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionOnvoChangeService.class);
    private static final String PLAN_GRATIS = "EMPRENDEDOR";

    private final SuscripcionRepository suscripcionRepo;
    private final EmpresaRepository empresaRepo;
    private final PlanRepository planRepo;
    private final OnvoBillingClient onvoBilling;
    private final OnvoService onvoService;
    private final SuscripcionPlanSupport planSupport;
    private final SuscripcionOnvoChangeService self;

    @Autowired(required = false)
    private BillingLedgerWriter ledgerWriter;

    /** Moneda de cobro de los planes para el ledger (config); sin ella el ledger usa su valor por defecto. */
    @Autowired(required = false)
    private PreciosPlanesConfig preciosPlanes;

    @Autowired(required = false)
    private org.springframework.cache.CacheManager cacheManager;

    private void evictTenant(Long empresaId) {
        if (cacheManager == null || empresaId == null) return;
        org.springframework.cache.Cache c = cacheManager.getCache("tenantInfo");
        if (c != null) c.evict(empresaId);
    }

    /** PAG-6: el modo simulado de ONVO solo se permite con perfil dev o test. Sin entorno → cerrado. */
    @Autowired(required = false)
    private org.springframework.core.env.Environment environment;

    boolean mockPermitido() {
        return environment != null
            && environment.acceptsProfiles(org.springframework.core.env.Profiles.of("(dev | test) & !prod & !production"))
            && !esProduccion();
    }

    /** Rechaza prod/production sin importar mayúsculas (p. ej. "dev,PROD"). */
    private boolean esProduccion() {
        String[] activos = environment.getActiveProfiles();
        if (activos == null) {
            return false;
        }
        for (String p : activos) {
            String n = p == null ? "" : p.trim().toLowerCase(java.util.Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) {
                return true;
            }
        }
        return false;
    }

    /** Camino simulado solo si el cliente está en modo mock (sin llave + dev/test) y este servicio también lo permite. */
    private boolean caminoMock() {
        return onvoBilling.isMockMode() && mockPermitido();
    }

    public SuscripcionOnvoChangeService(SuscripcionRepository suscripcionRepo,
                                        EmpresaRepository empresaRepo,
                                        PlanRepository planRepo,
                                        OnvoBillingClient onvoBilling,
                                        OnvoService onvoService,
                                        SuscripcionPlanSupport planSupport,
                                        @Lazy SuscripcionOnvoChangeService self) {
        this.suscripcionRepo = suscripcionRepo;
        this.empresaRepo = empresaRepo;
        this.planRepo = planRepo;
        this.onvoBilling = onvoBilling;
        this.onvoService = onvoService;
        this.planSupport = planSupport;
        this.self = self;
    }

    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> cambiarPlan(Long empresaId, Long planId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));
        // Decisión 26-oct: una tienda SUSPENDIDO_IMPAGO no cambia de plan (ni al gratis); solo paga lo pendiente.
        if (SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
            throw new IllegalStateException(SuspensionImpago.MSG_SOLO_PAGO);
        }
        // QA8: un negocio sin aprobar no elige ni paga plan (fail-closed, antes de tocar ONVO).
        if (EmpresaPendienteAprobacionException.ESTADO.equals(empresa.getEstadoEmpresa())) {
            throw new EmpresaPendienteAprobacionException();
        }
        return cambiarPlanInterno(empresa, planId);
    }

    /** Plan cuya mensualidad quedó impaga: el de la última suscripción VENCIDO, si es de pago. */
    @Transactional(readOnly = true)
    public Optional<Plan> planPendienteDeSuspension(Long empresaId) {
        return suscripcionRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(empresaId, "VENCIDO")
            .map(Suscripcion::getPlan)
            .filter(p -> p.getPrecioMensual() != null && p.getPrecioMensual() > 0);
    }

    /** Inicia por ONVO el pago del plan impago de una tienda suspendida. Reactiva solo el webhook ONVO. */
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> pagarSuspension(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));
        if (!SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
            throw new IllegalStateException("La tienda no está suspendida.");
        }
        Plan plan = planPendienteDeSuspension(empresaId)
            .orElseThrow(() -> new IllegalStateException("Sin mensualidad pendiente."));
        return cambiarPlanInterno(empresa, plan.getId());
    }

    private Map<String, Object> cambiarPlanInterno(Empresa empresa, Long planId) {
        Long empresaId = empresa.getId();
        Plan planDestino = planRepo.findById(planId)
            .orElseThrow(() -> new NoSuchElementException("Plan no encontrado: " + planId));

        String planActual = nombrePlanActual(empresa);
        // Auditor 5 S-01: con PAST_DUE/VENCIDO/TRIAL el mismo plan se puede pagar (reactivar).
        if (planDestino.getNombre().equalsIgnoreCase(planActual) && !puedeRepagarMismoPlan(empresa)) {
            throw new IllegalArgumentException("Ya tenés el plan " + planDestino.getNombre());
        }

        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (tieneStripeActivo(sub)) {
            throw new IllegalStateException(
                "Tenés una suscripción Stripe activa. Cancelala desde el portal antes de cambiar a ONVO.");
        }

        if (PLAN_GRATIS.equalsIgnoreCase(planDestino.getNombre())) {
            // Seguridad #333: bajar a gratis no es pagar; una tienda suspendida nunca llega acá.
            if (SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
                throw new IllegalStateException(SuspensionImpago.MSG_SOLO_PAGO);
            }
            return bajarAGratis(empresaId, sub);
        }

        if ((onvoBilling.isMockMode() || onvoBilling.sinLlave()) && !caminoMock()) {
            // Falla cerrado: sin ONVO_SECRET_KEY ningún camino activa un plan pago.
            throw new IllegalStateException("Pagos no configurados. No se cambió el plan.");
        }
        String priceId = resolverPriceId(planDestino.getNombre());
        if (sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank()) {
            return cambiarPlanExistente(empresaId, sub, planDestino, priceId);
        }
        return altaPlanPago(empresaId, empresa, planDestino, priceId, sub);
    }

    private String resolverPriceId(String planNombre) {
        String priceId = onvoBilling.getPriceIdForPlan(planNombre);
        if (priceId == null && !caminoMock()) {
            throw new IllegalArgumentException("Plan " + planNombre + " sin precio ONVO configurado");
        }
        return priceId != null ? priceId : "price_mock_" + planNombre;
    }

    private Map<String, Object> bajarAGratis(Long empresaId, Suscripcion sub) {
        if (sub == null || sub.getOnvoSubscriptionId() == null || sub.getOnvoSubscriptionId().isBlank()) {
            self.aplicarPlanLocal(empresaId, PLAN_GRATIS, null);
            return Map.of("status", "activado", "planNombre", PLAN_GRATIS);
        }
        OnvoBillingClient.ResultadoCancelacion r = onvoBilling.cancelarAlVencer(sub.getOnvoSubscriptionId());
        if (r == OnvoBillingClient.ResultadoCancelacion.CANCELADA) {
            // ONVO ya no cobra: se refleja el estado local en vez de dejar la suscripción ACTIVA.
            log.error("[ALERTA-PAGO] Suscripción ONVO cancelada de inmediato; se baja a {} empresa={}",
                PLAN_GRATIS, empresaId);
            self.procesarSuscripcionEliminada(sub.getOnvoSubscriptionId());
            return Map.of("status", "cancelado", "planNombre", PLAN_GRATIS);
        }
        if (r != OnvoBillingClient.ResultadoCancelacion.PROGRAMADA) {
            // Fail-closed: sin confirmación de ONVO no se toca el estado local.
            throw new IllegalStateException("ONVO no confirmó la cancelación. No se cambió el plan.");
        }
        self.marcarCancelarAlVencer(empresaId);
        return Map.of(
            "status", "pendiente_ciclo",
            "mensaje", "El plan se bajará a Emprendedor al vencer el período ya pagado"
        );
    }

    private Map<String, Object> cambiarPlanExistente(Long empresaId, Suscripcion sub,
                                                     Plan planDestino, String priceId) {
        String itemId = onvoBilling.obtenerPrimerItemId(sub.getOnvoSubscriptionId());
        onvoBilling.cambiarPrecioSuscripcion(sub.getOnvoSubscriptionId(), itemId, priceId);
        self.guardarOnvoPricePendiente(empresaId, planDestino, priceId);

        if (caminoMock()) {
            self.aplicarPlanLocal(empresaId, planDestino.getNombre(), priceId);
            return Map.of("status", "activado", "planNombre", planDestino.getNombre(), "mock", true);
        }
        return Map.of(
            "status", "actualizando",
            "mensaje", "Cambio de plan enviado a ONVO; se activa al confirmar el cobro"
        );
    }

    private Map<String, Object> altaPlanPago(Long empresaId, Empresa empresa, Plan planDestino,
                                             String priceId, Suscripcion subExistente) {
        String customerId = asegurarCustomer(empresa, subExistente);
        Map<String, String> meta = Map.of(
            "empresa_id", String.valueOf(empresaId),
            "plan_id", String.valueOf(planDestino.getId()),
            "plan_nombre", planDestino.getNombre()
        );
        OnvoBillingClient.OnvoSubscription onvoSub =
            onvoBilling.crearSuscripcionIncompleta(customerId, priceId, meta);
        self.guardarAltaOnvo(empresaId, planDestino, customerId, onvoSub.id(), priceId);

        if (caminoMock()) {
            self.aplicarPlanLocal(empresaId, planDestino.getNombre(), priceId);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("status", "activado");
            out.put("planNombre", planDestino.getNombre());
            out.put("mock", true);
            return out;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "requiere_pago");
        out.put("subscriptionId", onvoSub.id());
        out.put("customerId", customerId);
        out.put("publishableKey", onvoService.getPublishableKey());
        out.put("planNombre", planDestino.getNombre());
        return out;
    }

    private String asegurarCustomer(Empresa empresa, Suscripcion sub) {
        if (sub != null && sub.getOnvoCustomerId() != null && !sub.getOnvoCustomerId().isBlank()) {
            return sub.getOnvoCustomerId();
        }
        return onvoBilling.crearCustomer(
            empresa.getCorreoEmpresa(),
            empresa.getNombreEmpresa(),
            Map.of("empresa_id", String.valueOf(empresa.getId()))
        ).id();
    }

    @Transactional
    public void guardarAltaOnvo(Long empresaId, Plan plan, String customerId,
                                String subscriptionId, String priceId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseGet(() -> {
            Suscripcion s = new Suscripcion();
            s.setEmpresa(empresa);
            s.setPlan(plan);
            s.setEstado("TRIAL");
            s.setFechaInicio(LocalDate.now(Constants.ZONA_CR));
            return s;
        });
        sub.setPlan(plan);
        sub.setOnvoCustomerId(customerId);
        sub.setOnvoSubscriptionId(subscriptionId);
        sub.setOnvoPriceId(priceId);
        suscripcionRepo.save(sub);
    }

    @Transactional
    public void guardarOnvoPricePendiente(Long empresaId, Plan plan, String priceId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción activa", empresaId));
        sub.setPlan(plan);
        sub.setOnvoPriceId(priceId);
        sub.setCancelarAlVencer(false);
        suscripcionRepo.save(sub);
    }

    @Transactional
    public void marcarCancelarAlVencer(Long empresaId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción activa", empresaId));
        sub.setCancelarAlVencer(true);
        suscripcionRepo.save(sub);
    }

    /** Implementación actual del puerto: aplica el plan localmente (sin depender de la pasarela). */
    @Override
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public void planPagoConfirmado(Long empresaId, String planNombre, String proveedor, String referencia) {
        log.info("[plan-pago] Plan {} confirmado empresa={} proveedor={} ref={}", planNombre, empresaId, proveedor, referencia);
        // Solo un cobro ONVO confirmado reactiva una tienda suspendida (decisión 26-oct).
        aplicarPlanInterno(empresaId, planNombre, null, Constants.PROVEEDOR_ONVO.equalsIgnoreCase(proveedor));
    }

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public void aplicarPlanLocal(Long empresaId, String planNombre, String onvoPriceId) {
        // Sin reactivar: este camino no implica pago confirmado (bajar a gratis, mock dev/test).
        aplicarPlanInterno(empresaId, planNombre, onvoPriceId, false);
    }

    private void aplicarPlanInterno(Long empresaId, String planNombre, String onvoPriceId, boolean pagoConfirmado) {
        Plan plan = planRepo.findByNombre(planNombre)
            .orElseThrow(() -> new IllegalStateException("Plan " + planNombre + " no configurado"));
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseGet(() -> {
            Suscripcion s = new Suscripcion();
            s.setEmpresa(empresa);
            s.setFechaInicio(LocalDate.now(Constants.ZONA_CR));
            return s;
        });
        sub.setPlan(plan);
        sub.setEstado("ACTIVO");
        if (onvoPriceId != null) sub.setOnvoPriceId(onvoPriceId);
        sub.setCancelarAlVencer(false);
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusMonths(1);
        sub.setFechaFin(fin);
        suscripcionRepo.save(sub);

        empresa.setPlan(plan);
        empresa.setPlanSaas(planNombre);
        empresa.setEstadoPlan("ACTIVO");
        if (pagoConfirmado) SuspensionImpago.reactivarSiSuspendida(empresa);
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        log.info("[billing-onvo] Plan aplicado empresa={} plan={}", empresaId, planNombre);
    }

    /**
     * S-02: el plan y el fin de período vienen de ONVO (verificados en OnvoBillingVerificador), no de
     * metadata ni de sub.plan. La suscripción se busca solo por el id ONVO, con lock de fila.
     */
    @Transactional
    public void procesarPagoOnvoVerificado(String onvoSubId, String planNombre, LocalDate fin) {
        procesarPagoOnvoVerificado(onvoSubId, planNombre, fin, onvoSubId);
    }

    /** B2: {@code referenciaLedger} es el id de la factura de ONVO (una por cobro); sin él se usa el id de la suscripción. */
    @Transactional
    public void procesarPagoOnvoVerificado(String onvoSubId, String planNombre, LocalDate fin, String referenciaLedger) {
        Suscripcion sub = suscripcionRepo.findByOnvoSubscriptionIdForUpdate(onvoSubId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción ONVO", onvoSubId));
        Plan plan = planRepo.findByNombre(planNombre)
            .orElseThrow(() -> new IllegalStateException("Plan " + planNombre + " no configurado"));
        if (fin == null) {
            throw new IllegalStateException("Sin fin de período ONVO para " + onvoSubId);
        }
        sub.setPlan(plan);
        sub.setOnvoPriceId(onvoBilling.getPriceIdForPlan(planNombre));
        sub.setEstado("ACTIVO");
        sub.setCancelarAlVencer(false);
        sub.setFechaFin(fin);
        suscripcionRepo.save(sub);

        Empresa empresa = sub.getEmpresa();
        empresa.setPlan(plan);
        empresa.setPlanSaas(plan.getNombre());
        empresa.setEstadoPlan("ACTIVO");
        SuspensionImpago.reactivarSiSuspendida(empresa);
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        evictTenant(empresa.getId());
        anotarLedger(empresa, sub, BillingLedger.TIPO_COBRO_OK,
            referenciaValida(referenciaLedger) ? referenciaLedger : onvoSubId, "Pago ONVO verificado");
        log.info("[billing-onvo] Webhook verificado activó empresa={} plan={} fin={}", empresa.getId(), plan.getNombre(), fin);
    }

    @Transactional
    public void procesarRenovacionFallida(String onvoSubId) {
        suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).ifPresent(sub -> {
            sub.setEstado("PAST_DUE");
            suscripcionRepo.save(sub);
            Empresa empresa = sub.getEmpresa();
            empresa.setEstadoPlan("PAST_DUE");
            empresaRepo.save(empresa);
            anotarLedger(empresa, sub, BillingLedger.TIPO_COBRO_FALLIDO, onvoSubId, "Renovación ONVO fallida");
            log.warn("[billing-onvo] Renovación fallida empresa={} sub={}", empresa.getId(), onvoSubId);
        });
    }

    @Transactional
    public void procesarSuscripcionEliminada(String onvoSubId) {
        suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).ifPresent(sub -> {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now(Constants.ZONA_CR));
            suscripcionRepo.save(sub);
            planSupport.degradarAPlanBase(sub.getEmpresa());
            planRepo.findByNombre(PLAN_GRATIS).ifPresent(emprendedor -> {
                Empresa e = sub.getEmpresa();
                e.setPlan(emprendedor);
                e.setPlanSaas(PLAN_GRATIS);
                empresaRepo.save(e);
            });
            anotarLedger(sub.getEmpresa(), sub, BillingLedger.TIPO_CANCELACION, onvoSubId,
                "Suscripción ONVO cancelada");
            log.info("[billing-onvo] Suscripción eliminada empresa={}", sub.getEmpresa().getId());
        });
    }

    /** referencia_externa del ledger: id de ONVO con forma válida (y por tanto dentro de los 120 caracteres de la columna). */
    private static boolean referenciaValida(String ref) {
        return ref != null && OnvoBillingClient.idValido(ref);
    }

    private void anotarLedger(Empresa empresa, Suscripcion sub, String tipo, String ref, String detalle) {
        if (ledgerWriter == null) return;
        String moneda = preciosPlanes == null ? null : preciosPlanes.moneda().orElse(null);
        ledgerWriter.registrar(empresa, sub, tipo, BillingLedger.PROVEEDOR_ONVO, ref, null, moneda, detalle);
    }

    /**
     * QA8: {@code empresa.plan} es LAZY y este servicio corre sin transacción (open-in-view=false):
     * leer {@code getNombre()} del proxy lanzaba LazyInitializationException («no session») y el
     * cambio de plan respondía 500. Se lee solo el id del proxy (no lo inicializa) y el plan por repo.
     */
    private String nombrePlanActual(Empresa empresa) {
        Plan actual = empresa.getPlan();
        if (actual != null && actual.getId() != null) {
            String nombre = planRepo.findById(actual.getId()).map(Plan::getNombre).orElse(null);
            if (nombre != null) return nombre;
        }
        return empresa.getPlanSaas() != null ? empresa.getPlanSaas() : PLAN_GRATIS;
    }

    static boolean puedeRepagarMismoPlan(Empresa empresa) {
        String e = empresa.getEstadoPlan();
        return e != null && java.util.Set.of("PAST_DUE", "VENCIDO", "TRIAL").contains(e.toUpperCase(java.util.Locale.ROOT));
    }

    private static boolean tieneStripeActivo(Suscripcion sub) {
        return sub != null
            && sub.getStripeSubscriptionId() != null
            && !sub.getStripeSubscriptionId().isBlank()
            && !sub.getStripeSubscriptionId().startsWith("sub_mock");
    }
}
