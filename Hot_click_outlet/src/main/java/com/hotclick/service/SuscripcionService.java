package com.hotclick.service;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class SuscripcionService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionService.class);

    private final SuscripcionRepository suscripcionRepo;
    private final FacturaSaasRepository facturaRepo;
    private final StripeEventoRepository eventoRepo;
    private final EmpresaRepository empresaRepo;
    private final PlanRepository planRepo;
    private final StripeService stripeService;
    private final CacheManager cacheManager;

    /** Self-ref para que los métodos @Transactional auxiliares pasen por el proxy AOP. */
    @Autowired @Lazy
    private SuscripcionService self;

    public SuscripcionService(SuscripcionRepository suscripcionRepo,
                              FacturaSaasRepository facturaRepo,
                              StripeEventoRepository eventoRepo,
                              EmpresaRepository empresaRepo,
                              PlanRepository planRepo,
                              StripeService stripeService,
                              CacheManager cacheManager) {
        this.suscripcionRepo = suscripcionRepo;
        this.facturaRepo     = facturaRepo;
        this.eventoRepo      = eventoRepo;
        this.empresaRepo     = empresaRepo;
        this.planRepo        = planRepo;
        this.stripeService   = stripeService;
        this.cacheManager    = cacheManager;
    }

    // ── Trial ─────────────────────────────────────────────────────────────────

    /**
     * Inicia un período de trial de 14 días para la empresa.
     * Solo se ejecuta si la empresa no tiene suscripción activa.
     */
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
                .orElseThrow());

        LocalDate trialEnd = LocalDate.now().plusDays(14);

        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planPro);
        sub.setEstado("TRIAL");
        sub.setFechaInicio(LocalDate.now());
        sub.setTrialEnd(trialEnd);
        suscripcionRepo.save(sub);

        empresa.setEstadoPlan("TRIAL");
        empresa.setTrialHasta(trialEnd);
        empresa.setPlan(planPro);
        empresaRepo.save(empresa);

        log.info("[billing] Trial iniciado empresa={} hasta={}", empresaId, trialEnd);
        return sub;
    }

    // ── Checkout Stripe ───────────────────────────────────────────────────────

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
        Empresa empresa = empresaRepo.findById(empresaId).orElseThrow();
        Plan    plan    = planRepo.findById(planId).orElseThrow();
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
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseThrow();
        if (inmediata) {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now());
            degradarAFree(sub.getEmpresa());
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

    // ── Cancelación ───────────────────────────────────────────────────────────

    // ── Handlers de webhook ───────────────────────────────────────────────────

    /**
     * Idempotencia: retorna true si el evento ya fue procesado.
     * Registra el evento en la tabla de idempotencia.
     */
    @Transactional
    public boolean marcarEventoRecibido(String eventId, String tipo) {
        if (eventId == null || eventId.isBlank()) {
            log.warn("[stripe-webhook] marcarEventoRecibido llamado con eventId nulo/vacío — ignorando");
            return true;
        }
        return eventoRepo.findById(eventId).map(existing -> {
            if (Boolean.TRUE.equals(existing.getProcesadoOk())) {
                // El evento ya fue procesado con éxito — ignorar el reintento de Stripe
                log.info("[stripe-webhook] Evento procesado exitosamente — ignorando reintento: {}", eventId);
                return true;
            }
            // El intento previo falló (procesadoOk=false); permitir reintento
            log.info("[stripe-webhook] Reintentando evento fallido: {}", eventId);
            return false;
        }).orElseGet(() -> {
            StripeEvento ev = new StripeEvento();
            ev.setStripeEventId(eventId);
            ev.setTipo(tipo);
            eventoRepo.save(ev);
            return false;
        });
    }

    @Transactional
    public void marcarEventoProcesado(String eventId, boolean ok, String error) {
        eventoRepo.findById(eventId).ifPresent(ev -> {
            ev.setProcesadoOk(ok);
            ev.setFechaProcesado(LocalDateTime.now());
            ev.setError(error);
            eventoRepo.save(ev);
        });
    }

    /**
     * invoice.payment_succeeded → activa la suscripción, extiende vigencia, registra factura.
     */
    @Transactional
    @CacheEvict(value = "tenantInfo", allEntries = false, key = "#empresaId")
    public void procesarFacturaPagada(String stripeSubId, String stripeInvoiceId,
                                      String stripePaymentIntent, Long empresaId,
                                      int montoCentavos, String moneda,
                                      LocalDate periodoInicio, LocalDate periodoFin,
                                      String urlPdf) {
        Suscripcion sub = suscripcionRepo.findByStripeSubscriptionId(stripeSubId)
            .orElseGet(() -> {
                // Puede ser la primera factura antes de tener stripeSubId local
                if (empresaId == null) return null;
                return suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
            });

        if (sub != null) {
            sub.setStripeSubscriptionId(stripeSubId);
            sub.setEstado("ACTIVO");
            sub.setFechaFin(periodoFin);
            suscripcionRepo.save(sub);

            Empresa empresa = sub.getEmpresa();
            empresa.setEstadoPlan("ACTIVO");
            empresa.setFechaVencPlan(periodoFin);
            empresa.setPlan(sub.getPlan());
            empresaRepo.save(empresa);
        }

        // Registrar/actualizar factura (idempotente por stripeInvoiceId)
        FacturaSaas factura = facturaRepo.findByStripeInvoiceId(stripeInvoiceId)
            .orElseGet(FacturaSaas::new);
        factura.setStripeInvoiceId(stripeInvoiceId);
        factura.setStripePaymentIntent(stripePaymentIntent);
        factura.setMontoCentavos(montoCentavos);
        factura.setMoneda(moneda);
        factura.setEstado("PAGADO");
        factura.setPeriodoInicio(periodoInicio);
        factura.setPeriodoFin(periodoFin);
        factura.setUrlPdf(urlPdf);
        if (sub != null) {
            factura.setSuscripcion(sub);
            if (factura.getEmpresa() == null) factura.setEmpresa(sub.getEmpresa());
        } else if (empresaId != null && factura.getEmpresa() == null) {
            empresaRepo.findById(empresaId).ifPresent(factura::setEmpresa);
        }
        facturaRepo.save(factura);

        log.info("[billing] Factura pagada stripeInvoiceId={} monto={} {}", stripeInvoiceId, montoCentavos, moneda);
    }

    /**
     * invoice.payment_failed → marca PAST_DUE.
     */
    @Transactional
    public void procesarFacturaFallida(String stripeSubId, String stripeInvoiceId) {
        suscripcionRepo.findByStripeSubscriptionId(stripeSubId).ifPresent(sub -> {
            sub.setEstado("PAST_DUE");
            suscripcionRepo.save(sub);

            Empresa empresa = sub.getEmpresa();
            empresa.setEstadoPlan("PAST_DUE");
            empresaRepo.save(empresa);
            log.warn("[billing] Pago fallido empresa={} stripeSubId={}", empresa.getId(), stripeSubId);
        });

        facturaRepo.findByStripeInvoiceId(stripeInvoiceId).ifPresent(f -> {
            f.setEstado("FALLIDO");
            facturaRepo.save(f);
        });
    }

    /**
     * customer.subscription.deleted → cancela y degrada a FREE.
     */
    @Transactional
    public void procesarSuscripcionEliminada(String stripeSubId) {
        suscripcionRepo.findByStripeSubscriptionId(stripeSubId).ifPresent(sub -> {
            sub.setEstado("CANCELADO");
            sub.setFechaCancelacion(LocalDate.now());
            suscripcionRepo.save(sub);
            degradarAFree(sub.getEmpresa());
            log.info("[billing] Suscripción eliminada empresa={}", sub.getEmpresa().getId());
        });
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getSuscripcionInfo(Long empresaId) {
        Optional<Suscripcion> subOpt = suscripcionRepo.findActivaByEmpresaId(empresaId);
        Map<String, Object> info = new HashMap<>();

        if (subOpt.isEmpty()) {
            info.put("estado", "SIN_SUSCRIPCION");
            info.put("planNombre", "FREE");
            return info;
        }

        Suscripcion sub = subOpt.get();
        Plan plan = sub.getPlan();
        info.put("id", sub.getId());
        info.put("estado", sub.getEstado());
        info.put("planNombre", plan.getNombre());
        info.put("planId", plan.getId());
        info.put("fechaInicio", sub.getFechaInicio());
        info.put("fechaFin", sub.getFechaFin());
        info.put("trialEnd", sub.getTrialEnd());
        info.put("cancelarAlVencer", sub.getCancelarAlVencer());
        info.put("tieneStripe", sub.getStripeSubscriptionId() != null);
        return info;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFacturas(Long empresaId, int pagina) {
        var page = facturaRepo.findByEmpresaIdOrderByFechaCreacionDesc(
            empresaId, PageRequest.of(pagina, 20));
        return page.stream().map(f -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", f.getId());
            m.put("stripeInvoiceId", f.getStripeInvoiceId());
            m.put("montoCentavos", f.getMontoCentavos());
            m.put("moneda", f.getMoneda());
            m.put("estado", f.getEstado());
            m.put("periodoInicio", f.getPeriodoInicio());
            m.put("periodoFin", f.getPeriodoFin());
            m.put("urlPdf", f.getUrlPdf());
            m.put("fechaCreacion", f.getFechaCreacion());
            return m;
        }).toList();
    }

    // ── Scheduler ─────────────────────────────────────────────────────────────

    /** Expira trials vencidos → degrada a FREE. Llamado por BillingRenewalScheduler. */
    @Transactional
    public int expirarTrialsVencidos() {
        LocalDate hoy = LocalDate.now();
        // Leer IDs antes del batch update para poder evictar el cache después
        List<Long> empresaIds = suscripcionRepo.findEmpresaIdsTrialsVencidos(hoy);
        if (empresaIds.isEmpty()) return 0;

        int n = suscripcionRepo.expirarTrialsBatch(hoy);
        degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} trial(s) expirado(s) — {} empresa(s) degradadas", n, empresaIds.size());
        return n;
    }

    /** Expira PAST_DUE con fecha_fin pasada → degrada a FREE. */
    @Transactional
    public int expirarPastDueVencidos() {
        LocalDate hoy = LocalDate.now();
        List<Long> empresaIds = suscripcionRepo.findEmpresaIdsPastDueVencidos(hoy);
        if (empresaIds.isEmpty()) return 0;

        int n = suscripcionRepo.expirarPastDueBatch(hoy);
        degradarPlanBatchConCache(empresaIds, hoy);
        log.info("[billing] {} PAST_DUE expirado(s) — {} empresa(s) degradadas", n, empresaIds.size());
        return n;
    }

    private void degradarPlanBatchConCache(List<Long> empresaIds, LocalDate hoy) {
        planRepo.findByNombre("FREE").ifPresent(free -> {
            empresaRepo.degradarPlanBatch(empresaIds, free, hoy);
            // Evicción programática: @CacheEvict no soporta colecciones de claves
            Cache tenantCache = cacheManager.getCache("tenantInfo");
            if (tenantCache != null) {
                empresaIds.forEach(id -> tenantCache.evict(id));
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @CacheEvict(value = "tenantInfo", key = "#empresa.id")
    private void degradarAFree(Empresa empresa) {
        planRepo.findByNombre("FREE").ifPresent(free -> {
            empresa.setPlan(free);
            empresa.setEstadoPlan("VENCIDO");
            empresa.setFechaVencPlan(LocalDate.now());
            empresaRepo.save(empresa);
        });
    }
}
