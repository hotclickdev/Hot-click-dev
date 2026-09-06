package com.hotclick.service.suscripcion;

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
public class SuscripcionOnvoChangeService {

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
        Plan planDestino = planRepo.findById(planId)
            .orElseThrow(() -> new NoSuchElementException("Plan no encontrado: " + planId));

        String planActual = nombrePlanActual(empresa);
        if (planDestino.getNombre().equalsIgnoreCase(planActual)) {
            throw new IllegalArgumentException("Ya tenés el plan " + planDestino.getNombre());
        }

        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (tieneStripeActivo(sub)) {
            throw new IllegalStateException(
                "Tenés una suscripción Stripe activa. Cancelala desde el portal antes de cambiar a ONVO.");
        }

        if (PLAN_GRATIS.equalsIgnoreCase(planDestino.getNombre())) {
            return bajarAGratis(empresaId, sub);
        }

        String priceId = resolverPriceId(planDestino.getNombre());
        if (sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank()) {
            return cambiarPlanExistente(empresaId, sub, planDestino, priceId);
        }
        return altaPlanPago(empresaId, empresa, planDestino, priceId, sub);
    }

    private String resolverPriceId(String planNombre) {
        String priceId = onvoBilling.getPriceIdForPlan(planNombre);
        if (priceId == null && !onvoBilling.isMockMode()) {
            throw new IllegalArgumentException("Plan " + planNombre + " sin precio ONVO configurado");
        }
        return priceId != null ? priceId : "price_mock_" + planNombre;
    }

    private Map<String, Object> bajarAGratis(Long empresaId, Suscripcion sub) {
        if (sub == null || sub.getOnvoSubscriptionId() == null || sub.getOnvoSubscriptionId().isBlank()) {
            self.aplicarPlanLocal(empresaId, PLAN_GRATIS, null);
            return Map.of("status", "activado", "planNombre", PLAN_GRATIS);
        }
        onvoBilling.cancelarAlVencer(sub.getOnvoSubscriptionId());
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

        if (onvoBilling.isMockMode()) {
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

        if (onvoBilling.isMockMode()) {
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

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public void aplicarPlanLocal(Long empresaId, String planNombre, String onvoPriceId) {
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
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        log.info("[billing-onvo] Plan aplicado empresa={} plan={}", empresaId, planNombre);
    }

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public void procesarPagoOnvoExitoso(Long empresaId, String onvoSubId, Long planId) {
        Suscripcion sub = suscripcionRepo.findByOnvoSubscriptionId(onvoSubId)
            .or(() -> empresaId != null
                ? suscripcionRepo.findActivaByEmpresaId(empresaId)
                : Optional.empty())
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción ONVO", onvoSubId));

        Plan plan = planId != null
            ? planRepo.findById(planId).orElse(sub.getPlan())
            : sub.getPlan();
        if (plan == null) {
            throw new IllegalStateException("Sin plan para activar suscripción ONVO " + onvoSubId);
        }

        sub.setOnvoSubscriptionId(onvoSubId);
        sub.setPlan(plan);
        sub.setEstado("ACTIVO");
        sub.setCancelarAlVencer(false);
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusMonths(1);
        sub.setFechaFin(fin);
        suscripcionRepo.save(sub);

        Empresa empresa = sub.getEmpresa();
        empresa.setPlan(plan);
        empresa.setPlanSaas(plan.getNombre());
        empresa.setEstadoPlan("ACTIVO");
        empresa.setFechaVencPlan(fin);
        empresaRepo.save(empresa);
        anotarLedger(empresa, sub, BillingLedger.TIPO_COBRO_OK, onvoSubId, "Pago ONVO confirmado");
        log.info("[billing-onvo] Webhook activó empresa={} plan={}", empresa.getId(), plan.getNombre());
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
            planSupport.degradarAFree(sub.getEmpresa());
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

    private void anotarLedger(Empresa empresa, Suscripcion sub, String tipo, String ref, String detalle) {
        if (ledgerWriter == null) return;
        ledgerWriter.registrar(empresa, sub, tipo, BillingLedger.PROVEEDOR_ONVO, ref, null, "crc", detalle);
    }

    private static String nombrePlanActual(Empresa empresa) {
        if (empresa.getPlan() != null && empresa.getPlan().getNombre() != null) {
            return empresa.getPlan().getNombre();
        }
        return empresa.getPlanSaas() != null ? empresa.getPlanSaas() : PLAN_GRATIS;
    }

    private static boolean tieneStripeActivo(Suscripcion sub) {
        return sub != null
            && sub.getStripeSubscriptionId() != null
            && !sub.getStripeSubscriptionId().isBlank()
            && !sub.getStripeSubscriptionId().startsWith("sub_mock");
    }
}
