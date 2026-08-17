package com.hotclick.service.suscripcion;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.StripeService;
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
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class SuscripcionBillingService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionBillingService.class);

    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private EmpresaRepository     empresaRepo;
    @Autowired private PlanRepository        planRepo;
    @Autowired private StripeService         stripeService;
    @Autowired private SuscripcionPlanSupport planSupport;

    /** Self-ref para que los métodos @Transactional auxiliares pasen por el proxy AOP. */
    @Autowired @Lazy
    private SuscripcionBillingService self;

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Suscripcion iniciarTrial(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));

        Optional<Suscripcion> existente = suscripcionRepo.findActivaByEmpresaId(empresaId);
        if (existente.isPresent()) {
            return existente.get();
        }

        Plan planPro = planRepo.findByNombre("PRO")
            .orElseGet(() -> planRepo.findAll().stream()
                .filter(p -> !"FREE".equals(p.getNombre())).findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException("Plan no-FREE no configurado")));

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
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));
        Plan plan = planRepo.findById(planId)
            .orElseThrow(() -> new NoSuchElementException("Plan no encontrado: " + planId));
        String priceId = stripeService.getPriceIdForPlan(plan.getNombre());
        if (priceId == null)
            throw new IllegalArgumentException("Plan " + plan.getNombre() + " sin precio Stripe");
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
     * TX1 (leer stripeSubId) → HTTP Stripe → TX2 (guardar cancelación).
     */
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public void cancelar(Long empresaId, boolean inmediata) throws StripeException {
        String stripeSubId = self.leerStripeSubId(empresaId);

        // HTTP Stripe — fuera de TX
        stripeService.cancelarSuscripcion(stripeSubId, inmediata);

        // TX2: persistir resultado
        self.aplicarCancelacion(empresaId, inmediata);
        log.info("[billing] Suscripción cancelada empresa={} inmediata={}", empresaId, inmediata);
    }

    @Transactional(readOnly = true)
    public String leerStripeSubId(Long empresaId) {
        return suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> new NoSuchElementException("No hay suscripción activa para empresa " + empresaId))
            .getStripeSubscriptionId();
    }

    @Transactional
    public void aplicarCancelacion(Long empresaId, boolean inmediata) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción activa para empresa " + empresaId + " no encontrada"));
        if (inmediata) {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now(Constants.ZONA_CR));
            planSupport.degradarAFree(sub.getEmpresa());
        } else {
            sub.setCancelarAlVencer(true);
        }
        suscripcionRepo.save(sub);
    }

    /** Sin @Transactional: la lectura usa la TX propia del repo, luego HTTP sin conexión retenida. */
    public String crearPortalUrl(Long empresaId) throws StripeException {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));
        if (empresa.getStripeCustomerId() == null)
            throw new IllegalStateException("Empresa no tiene Customer Stripe");
        return stripeService.crearPortalSession(empresa.getStripeCustomerId());
    }
}
