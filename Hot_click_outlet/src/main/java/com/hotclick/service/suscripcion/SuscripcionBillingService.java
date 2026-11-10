package com.hotclick.service.suscripcion;

import com.hotclick.exception.CancelacionConSubidaPendienteException;
import com.hotclick.exception.CancelacionOnvoNoDisponibleException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.ErrorPublico;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.StripeService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class SuscripcionBillingService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionBillingService.class);

    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private EmpresaRepository     empresaRepo;
    @Autowired private PlanRepository        planRepo;
    @Autowired private StripeService         stripeService;
    @Autowired private SuscripcionPlanSupport planSupport;
    /** ONVO es la pasarela de las suscripciones; sin bean, una cancelación con id ONVO falla cerrada (503). */
    @Autowired(required = false) private OnvoBillingClient onvoBilling;

    /** Auditor 5 S-07: plan que recibe el trial de 14 días. */
    @org.springframework.beans.factory.annotation.Value("${hotclick.billing.plan-trial:PYME}")
    private String planTrial = "PYME";

    /** Self-ref para que los métodos @Transactional auxiliares pasen por el proxy AOP. */
    @Autowired @Lazy
    private SuscripcionBillingService self;

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Suscripcion iniciarTrial(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));

        Optional<Suscripcion> existente = suscripcionRepo.findActivaByEmpresaId(empresaId);
        if (existente.isPresent()) {
            return existente.get();
        }
        // P10-03: un solo trial por empresa. Sin esto, al expirar (o cancelar) se podía pedir otro.
        if (suscripcionRepo.existsByEmpresa_IdAndTrialEndIsNotNull(empresaId)) {
            throw new IllegalStateException("Este negocio ya usó su período de prueba.");
        }

        // Auditor 5 S-07: el plan del trial sale de configuración; sin fallback a un plan arbitrario.
        Plan planPro = planRepo.findByNombre(planTrial)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle(ErrorPublico.GENERICO, "plan de trial no configurado: " + planTrial));

        LocalDate trialEnd = LocalDate.now(Constants.ZONA_CR).plusDays(14);

        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planPro);
        sub.setEstado("TRIAL");
        sub.setFechaInicio(LocalDate.now(Constants.ZONA_CR));
        sub.setTrialEnd(trialEnd);
        suscripcionRepo.save(sub);

        empresa.setEstadoPlan("TRIAL");
        empresa.setTrialHasta(trialEnd);
        empresa.setPlan(planPro);
        empresaRepo.save(empresa);

        log.info("[billing] Trial iniciado empresa={} hasta={}", empresaId, trialEnd);
        return sub;
    }

    /**
     * TX1 → HTTP Stripe → TX2 → HTTP Stripe: ninguna TX bloquea la conexión BD durante los calls HTTP.
     */
    public String crearCheckoutUrl(Long empresaId, Long planId) throws StripeException {
        // TX1: leer datos sin hacer ningún call HTTP
        String[] datos = self.leerDatosParaCheckout(empresaId, planId);
        String correo           = datos[0];
        String nombre           = datos[1];
        String existingCustomer = datos[2];
        String priceId          = datos[3];

        // HTTP Stripe 1 — fuera de TX
        String customerId = stripeService.crearORecuperarCustomer(empresaId, correo, nombre, existingCustomer);

        // TX2: guardar customerId y crear/actualizar suscripción; devuelve sub.id
        Long subId = self.guardarClienteYSuscripcion(empresaId, planId, customerId, priceId);

        // HTTP Stripe 2 — fuera de TX
        return stripeService.crearCheckoutSession(customerId, priceId, empresaId, subId);
    }

    @Transactional(readOnly = true)
    public String[] leerDatosParaCheckout(Long empresaId, Long planId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
        Plan plan = planRepo.findById(planId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Plan no encontrado", "planId=" + planId));
        String priceId = stripeService.getPriceIdForPlan(plan.getNombre());
        if (priceId == null) {
            log.warn("[billing] plan {} sin precio configurado; checkout bloqueado (empresa={})", plan.getNombre(), empresaId);
            throw new com.hotclick.exception.PlanNoDisponibleException();
        }
        return new String[]{empresa.getCorreoEmpresa(), empresa.getNombreEmpresa(),
                             empresa.getStripeCustomerId(), priceId};
    }

    @Transactional
    public Long guardarClienteYSuscripcion(Long empresaId, Long planId, String customerId, String priceId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        Plan    plan    = planRepo.findById(planId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Plan", planId));
        if (!customerId.equals(empresa.getStripeCustomerId())) {
            empresa.setStripeCustomerId(customerId);
            empresaRepo.save(empresa);
        }
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseGet(() -> {
            Suscripcion s = new Suscripcion();
            s.setEmpresa(empresa);
            s.setPlan(plan);
            s.setEstado("TRIAL");
            s.setStripeCustomerId(customerId);
            return suscripcionRepo.save(s);
        });
        sub.setPlan(plan);
        sub.setStripeCustomerId(customerId);
        sub.setStripePriceId(priceId);
        return suscripcionRepo.save(sub).getId();
    }

    /**
     * MEDIO Seguridad (Opción A): TX1 (leer ids) → ONVO (fail-closed) → Stripe heredado → TX2 (guardar cancelación).
     * <p>Con id de suscripción ONVO se cancela PRIMERO en ONVO ({@link OnvoBillingClient#cancelarPorNegocio}); si ONVO
     * falla, no responde o la respuesta es ambigua → {@link CancelacionOnvoNoDisponibleException} (503) y CERO cambios
     * locales. Solo con la confirmación de ONVO se aplica la cancelación local. El cliente Stripe se llama únicamente si
     * hay id de Stripe (antes se llamaba con null y su no-op dejaba viva la suscripción ONVO, que el cobro al final del
     * trial reactivaba por webhook). Sin id ONVO ni Stripe el comportamiento es el de siempre.
     *
     * @return true si la suscripción quedó cancelada ya (pedida inmediata, o ONVO la reportó cancelada).
     */
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public boolean cancelar(Long empresaId, boolean inmediata) throws StripeException {
        if (self.planPagadoNoSeCancelaSolo(empresaId)) {
            throw new com.hotclick.exception.CambioPlanRequiereSolicitudException();
        }
        IdsExternos ids = self.leerIdsExternos(empresaId);
        if (idPresente(ids.onvoNuevaPendiente())) {
            throw new CancelacionConSubidaPendienteException();
        }

        boolean cancelarYa = inmediata;
        if (idPresente(ids.onvo())) {
            // HTTP ONVO — fuera de TX y ANTES de cualquier cambio local.
            OnvoBillingClient.ResultadoCancelacion r = cancelarEnOnvo(empresaId, ids.onvo(), inmediata);
            if (r == OnvoBillingClient.ResultadoCancelacion.CANCELADA) cancelarYa = true;
        }

        if (idPresente(ids.stripe())) {
            // HTTP Stripe (suscripciones heredadas) — fuera de TX
            stripeService.cancelarSuscripcion(ids.stripe(), inmediata);
        }

        // TX2: persistir resultado (la fila tiene que seguir con el mismo id ONVO que se canceló)
        self.aplicarCancelacion(empresaId, cancelarYa, ids.onvo());
        log.info("[billing] Suscripción cancelada empresa={} inmediata={} efectiva={} onvo={}",
            empresaId, inmediata, cancelarYa, idPresente(ids.onvo()));
        return cancelarYa;
    }

    private OnvoBillingClient.ResultadoCancelacion cancelarEnOnvo(Long empresaId, String onvoSubId, boolean inmediata) {
        if (onvoBilling == null) {
            log.error("[ALERTA-PAGO] [billing] cancelación con suscripción ONVO sin cliente ONVO; no se toca nada empresa={}",
                empresaId);
            throw new CancelacionOnvoNoDisponibleException();
        }
        OnvoBillingClient.ResultadoCancelacion r;
        try {
            r = onvoBilling.cancelarPorNegocio(onvoSubId, inmediata);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] [billing] ONVO no confirmó la cancelación; sin cambios locales empresa={} inmediata={}"
                    + " causa={} status={}",
                empresaId, inmediata, e.getClass().getSimpleName(), OnvoBillingClient.statusDe(e));
            throw new CancelacionOnvoNoDisponibleException();
        }
        if (r == null) {
            log.error("[ALERTA-PAGO] [billing] ONVO sin resultado de cancelación; sin cambios locales empresa={}", empresaId);
            throw new CancelacionOnvoNoDisponibleException();
        }
        return r;
    }

    /** Ids externos de la suscripción activa (Stripe heredado, ONVO vigente y ONVO de una subida pendiente). */
    public record IdsExternos(String stripe, String onvo, String onvoNuevaPendiente) {}

    @Transactional(readOnly = true)
    public IdsExternos leerIdsExternos(Long empresaId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Suscripción activa no encontrada", "empresaId=" + empresaId));
        return new IdsExternos(sub.getStripeSubscriptionId(), sub.getOnvoSubscriptionId(), sub.getOnvoSubNuevaPendiente());
    }

    /** true si la baja la tiene que revisar el admin. No llama a Stripe ni a ONVO. */
    @Transactional(readOnly = true)
    public boolean planPagadoNoSeCancelaSolo(Long empresaId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (sub == null) return false;
        Empresa empresa = sub.getEmpresa();
        String nombre = nombrePlan(sub, empresa);
        boolean cobroExterno = idPresente(sub.getOnvoSubscriptionId()) || idPresente(sub.getStripeSubscriptionId());
        return SuscripcionOnvoChangeService.cancelacionDePlanPagado(
            nombre, sub.getEstado(), empresa == null ? null : empresa.getEstadoPlan(), cobroExterno);
    }

    private static String nombrePlan(Suscripcion sub, Empresa empresa) {
        if (sub.getPlan() != null && sub.getPlan().getNombre() != null) return sub.getPlan().getNombre();
        if (empresa != null && empresa.getPlan() != null && empresa.getPlan().getNombre() != null) {
            return empresa.getPlan().getNombre();
        }
        return empresa == null ? null : empresa.getPlanSaas();
    }

    private static boolean idPresente(String id) {
        return id != null && !id.isBlank();
    }

    @Transactional(readOnly = true)
    public String leerStripeSubId(Long empresaId) {
        return suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Suscripción activa no encontrada", "empresaId=" + empresaId))
            .getStripeSubscriptionId();
    }

    @Transactional
    public void aplicarCancelacion(Long empresaId, boolean inmediata) {
        aplicarCancelacion(empresaId, inmediata, null);
    }

    /**
     * Con {@code onvoCancelada} (id ONVO ya cancelado/programado en ONVO), la fila activa tiene que seguir teniendo ese
     * mismo id; si cambió entre la lectura y ahora, no se toca nada y queda alerta para revisión.
     */
    @Transactional
    public void aplicarCancelacion(Long empresaId, boolean inmediata, String onvoCancelada) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Suscripción activa no encontrada", "empresaId=" + empresaId));
        if (idPresente(onvoCancelada) && !onvoCancelada.equals(sub.getOnvoSubscriptionId())) {
            log.error("[ALERTA-PAGO] [billing] la suscripción ONVO de la fila cambió durante la cancelación; no se aplica"
                + " localmente, revisar a mano empresa={}", empresaId);
            throw new CancelacionOnvoNoDisponibleException();
        }
        if (inmediata) {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now(Constants.ZONA_CR));
            planSupport.degradarAPlanBase(sub.getEmpresa());
        } else {
            sub.setCancelarAlVencer(true);
        }
        suscripcionRepo.save(sub);
    }

    /** Sin @Transactional: la lectura usa la TX propia del repo, luego HTTP sin conexión retenida. */
    public String crearPortalUrl(Long empresaId) throws StripeException {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
        if (empresa.getStripeCustomerId() == null)
            throw new IllegalStateException("Empresa no tiene Customer Stripe");
        return stripeService.crearPortalSession(empresa.getStripeCustomerId());
    }
}
