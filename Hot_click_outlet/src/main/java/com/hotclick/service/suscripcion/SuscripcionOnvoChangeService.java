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
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.function.Supplier;

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

    /**
     * Transacción programática del alta ONVO: el lock de fila del negocio tiene que durar desde releer el estado hasta
     * guardar el id de la suscripción, y el commit tiene que poder fallar DENTRO del try que reconcilia la huérfana
     * (con {@code @Transactional} el commit falla fuera del método y no se podría cancelar la suscripción creada).
     * Sin bean (tests unitarios con repos simulados) corre sin transacción; en producción siempre existe.
     */
    @Autowired(required = false)
    private TransactionTemplate tx;

    /** Tope de espera por el lock de fila (5 s, PostgreSQL). Sin bean (tests unitarios) no se aplica. */
    @Autowired(required = false)
    private LockTimeoutPorFila lockTimeout;

    private <T> T enTransaccion(Supplier<T> trabajo) {
        return tx == null ? trabajo.get() : tx.execute(status -> trabajo.get());
    }

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
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
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

    /**
     * Aviso de plan pendiente: si la suscripción ONVO está en trialing CON método de pago guardado no falta ningún
     * pago (ONVO cobra solo al terminar el trial). Devuelve la fecha del primer cobro (trialEnd, o currentPeriodEnd si
     * no viene) en hora de Costa Rica. Sin suscripción, otro estado, fecha ilegible o ONVO caído → vacío (la UI sigue
     * mostrando «falta el pago», que es lo conservador).
     */
    public Optional<LocalDate> primerCobroTrialConMetodo(Long empresaId) {
        try {
            Optional<Suscripcion> sub = suscripcionRepo.findActivaByEmpresaId(empresaId);
            String id = sub.map(Suscripcion::getOnvoSubscriptionId).orElse(null);
            if (id == null || !OnvoBillingClient.idValido(id) || onvoBilling.isMockMode() || onvoBilling.sinLlave()) {
                return Optional.empty();
            }
            Map<?, ?> enOnvo = onvoBilling.obtenerSuscripcion(id);
            return primerCobroTrial(enOnvo);
        } catch (RuntimeException e) {
            log.warn("[billing-onvo] no se pudo leer el trial en ONVO empresa={} causa={}", empresaId, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    static Optional<LocalDate> primerCobroTrial(Map<?, ?> enOnvo) {
        if (enOnvo == null || !"trialing".equals(String.valueOf(enOnvo.get("status")))
            || !OnvoBillingClient.tieneMetodoPago(enOnvo)) return Optional.empty();
        for (String campo : new String[]{"trialEnd", "currentPeriodEnd"}) {
            if (enOnvo.get(campo) instanceof String s && !s.isBlank()) {
                try {
                    return Optional.of(java.time.Instant.parse(s).atZone(Constants.ZONA_CR).toLocalDate());
                } catch (java.time.format.DateTimeParseException ignored) {
                    // siguiente campo
                }
            }
        }
        return Optional.empty();
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
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
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
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Plan no encontrado", "planId=" + planId));

        String planActual = nombrePlanActual(empresa);
        // Auditor 5 S-01: con PAST_DUE/VENCIDO/TRIAL el mismo plan se puede pagar (reactivar).
        if (planDestino.getNombre().equalsIgnoreCase(planActual) && !puedeRepagarMismoPlan(empresa)) {
            throw new com.hotclick.exception.PlanYaActivoException(planDestino.getNombre());
        }

        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (tieneStripeActivo(sub)) {
            throw new IllegalStateException(
                "Tenés una suscripción Stripe activa. Cancelala desde el portal antes de cambiar a ONVO.");
        }

        // Emprendedor ya no es gratis para quien tomó el trial o entró sin cupo: no «baja a gratis», paga US$9 por ONVO.
        // Si no, al terminar el trial bastaría con elegir Emprendedor para quedarse gratis para siempre.
        boolean emprendedorDePago = PLAN_GRATIS.equalsIgnoreCase(planDestino.getNombre())
            && TrialEmprendedorService.emprendedorEsDePago(empresa);

        if (PLAN_GRATIS.equalsIgnoreCase(planDestino.getNombre()) && !emprendedorDePago) {
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
        if (emprendedorDePago && sub != null && sub.getOnvoSubscriptionId() != null
            && priceId.equals(sub.getOnvoPriceId())) {
            // Ya hay suscripción ONVO de Emprendedor (trial o en cobro): idempotente, no se crea otra ni se cambia precio.
            return respuestaRequierePago(empresa, planDestino, sub.getOnvoCustomerId(), sub.getOnvoSubscriptionId());
        }
        if (sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank()) {
            return cambiarPlanExistente(empresaId, empresa, sub, planDestino, priceId);
        }
        return altaPlanPago(empresaId, empresa, planDestino, priceId, sub);
    }

    /** Suscripción ONVO del trial Emprendedor sobre la que el SDK confirma la tarjeta ({@code mock} = sin ONVO real). */
    public record SuscripcionTrial(String customerId, String subscriptionId, boolean mock) {}

    /**
     * Devuelve (o crea una vez) la suscripción ONVO en {@code trialing} del trial Emprendedor, para que el SDK web
     * confirme la tarjeta. NUNCA activa el plan local ni cambia el estado del negocio: sigue en TRIAL y no se cobra
     * nada hasta que termina el trial. Fail-closed: sin llave real (y fuera de dev/test) no se hace nada.
     * Otra suscripción ONVO con otro precio, o una de Stripe, no se toca: es un estado ajeno al trial.
     */
    public SuscripcionTrial asegurarSuscripcionTrial(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada"));
        if ((onvoBilling.isMockMode() || onvoBilling.sinLlave()) && !caminoMock()) {
            throw new com.hotclick.exception.CobroPlanNoDisponibleException(PLAN_GRATIS);
        }
        if (onvoBilling.isBillingDeshabilitado()) {
            throw new com.hotclick.exception.CobroPlanNoDisponibleException(PLAN_GRATIS);
        }
        if (caminoMock()) {
            return new SuscripcionTrial(null, null, true);
        }
        int dias = TrialEmprendedorService.diasRestantes(empresa, LocalDate.now(Constants.ZONA_CR));
        if (dias <= 0) {
            throw new IllegalStateException("El trial ya terminó.");
        }
        Plan plan = planRepo.findByNombre(PLAN_GRATIS)
            .orElseThrow(() -> new NoSuchElementException("Plan gratis no encontrado"));
        Suscripcion sub = primeraActiva(empresaId);
        if (tieneStripeActivo(sub)) {
            throw new IllegalStateException("Tenés una suscripción Stripe activa.");
        }
        String priceId = resolverPriceId(PLAN_GRATIS);
        boolean tieneOnvo = sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank();
        if (tieneOnvo) {
            if (!priceId.equals(sub.getOnvoPriceId())) {
                throw new IllegalStateException("La suscripción ONVO no es la del trial Emprendedor.");
            }
            return new SuscripcionTrial(sub.getOnvoCustomerId(), sub.getOnvoSubscriptionId(), false);
        }
        // Dos POST seguidos (o un doble clic) llegan hasta acá a la vez con tieneOnvo=false: el alta única la decide el
        // lock del negocio, que vuelve a leer el estado antes de crear nada en ONVO.
        AltaOnvo alta = altaOnvoUnica(empresaId, empresa, sub, plan, priceId, dias);
        return new SuscripcionTrial(alta.customerId(), alta.subscriptionId(), false);
    }

    /** Suscripción ONVO que quedó guardada para el negocio ({@code creada} = la creó esta llamada y no otra concurrente). */
    record AltaOnvo(String customerId, String subscriptionId, boolean creada) {}

    /** Primera suscripción no cancelada del negocio; si hay más de una avisa (sin PII) en vez de tirar IncorrectResultSize. */
    private Suscripcion primeraActiva(Long empresaId) {
        List<Suscripcion> activas = suscripcionRepo.findActivasByEmpresaId(empresaId);
        if (activas == null || activas.isEmpty()) return null;
        if (activas.size() > 1) {
            log.warn("[ALERTA-PAGO] [onvo-alta] empresa={} tiene {} suscripciones no canceladas; se usa la más reciente",
                empresaId, activas.size());
        }
        return activas.get(0);
    }

    /**
     * M1 (Seguridad #422): crea A LO SUMO una suscripción ONVO por negocio, aunque lleguen dos POST a la vez.
     * <ol>
     *   <li>Toma el lock de fila del negocio ({@code findByIdForUpdate}, PESSIMISTIC_WRITE; H2 y Postgres).</li>
     *   <li>Vuelve a leer la suscripción: si otra llamada ya guardó el {@code onvoSubscriptionId}, lo devuelve y NO crea
     *       otra (jamás se pisa un id existente).</li>
     *   <li>Si no hay, crea el customer y la suscripción en ONVO y guarda el id antes de soltar el lock.</li>
     *   <li>Si algo falla después de crear en ONVO (guardado o commit), cancela esa suscripción: nunca queda una huérfana
     *       que cobre al terminar el trial.</li>
     * </ol>
     */
    private AltaOnvo altaOnvoUnica(Long empresaId, Empresa empresaLeida, Suscripcion subPrevia, Plan plan,
                                  String priceId, int diasTrial) {
        // MEDIUM-1 (Seguridad #426): el customer se crea ANTES de tomar el lock (con su @Retry): si ONVO está lento, el
        // lock no queda retenido minutos. Dentro del lock solo queda un POST de suscripción, sin reintentos. Una
        // carrera puede dejar un customer sin suscripción (inofensivo: no cobra nada).
        String customerPrevio = tieneOnvoGuardado(subPrevia) ? null : asegurarCustomer(empresaLeida, subPrevia);
        String[] creadaEnOnvo = new String[1];
        try {
            return enTransaccion(() -> altaOnvoBajoLock(empresaId, plan, priceId, diasTrial, customerPrevio, creadaEnOnvo));
        } catch (RuntimeException ex) {
            if (creadaEnOnvo[0] != null) {
                cancelarHuerfana(empresaId, creadaEnOnvo[0], ex);
            }
            throw ex;
        }
    }

    private static boolean tieneOnvoGuardado(Suscripcion sub) {
        return sub != null && sub.getOnvoSubscriptionId() != null && !sub.getOnvoSubscriptionId().isBlank();
    }

    /** Toma el lock de fila con tope de espera; si otra llamada lo retiene demasiado, 409 con texto fijo (sin tocar ONVO). */
    private Empresa bloquearEmpresa(Long empresaId) {
        try {
            if (lockTimeout != null) lockTimeout.aplicar();
            return empresaRepo.findByIdForUpdate(empresaId)
                .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada"));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                 | jakarta.persistence.PessimisticLockException
                 | jakarta.persistence.LockTimeoutException e) {
            log.warn("[onvo-alta] lock del negocio ocupado, se responde 409 empresa={} causa={}",
                empresaId, e.getClass().getSimpleName());
            throw new com.hotclick.exception.AltaOnvoEnCursoException();
        }
    }

    private AltaOnvo altaOnvoBajoLock(Long empresaId, Plan plan, String priceId, int diasTrial,
                                      String customerPrevio, String[] creadaEnOnvo) {
        Empresa empresa = bloquearEmpresa(empresaId);
        Suscripcion sub = primeraActiva(empresaId);
        if (tieneOnvoGuardado(sub)) {
            // Otra llamada ganó la carrera y ya guardó su suscripción: se reutiliza, no se crea una segunda.
            if (!priceId.equals(sub.getOnvoPriceId())) {
                throw new IllegalStateException("Ya hay una suscripción ONVO en curso con otro precio.");
            }
            log.warn("[onvo-alta] alta concurrente evitada empresa={} sub={}", empresaId, sub.getOnvoSubscriptionId());
            return new AltaOnvo(sub.getOnvoCustomerId(), sub.getOnvoSubscriptionId(), false);
        }
        // Customer: el ya guardado, si no el creado antes del lock; solo si faltara ambos (raro) se crea acá.
        String customerId = sub != null && sub.getOnvoCustomerId() != null && !sub.getOnvoCustomerId().isBlank()
            ? sub.getOnvoCustomerId()
            : (customerPrevio != null ? customerPrevio : asegurarCustomer(empresa, sub));
        Map<String, String> meta = Map.of(
            "empresa_id", String.valueOf(empresaId),
            "plan_id", String.valueOf(plan.getId()),
            "plan_nombre", plan.getNombre()
        );
        OnvoBillingClient.OnvoSubscription onvoSub;
        try {
            onvoSub = diasTrial > 0
                ? onvoBilling.crearSuscripcionIncompleta(customerId, priceId, meta, diasTrial)
                : onvoBilling.crearSuscripcionIncompleta(customerId, priceId, meta);
        } catch (RuntimeException e) {
            if (esErrorDeRed(e)) {
                // L2: sin respuesta no se sabe si ONVO la creó. No hay listado en ONVO para recuperarla: alerta con el
                // negocio para revisarla a mano (sin PII, solo clase de la excepción).
                log.error("[ALERTA-PAGO] [onvo-alta] sin respuesta de ONVO al crear la suscripción; pudo quedar creada sin"
                        + " guardar. Revisar en ONVO empresa_id={} causa={}",
                    empresaId, e.getClass().getSimpleName());
            }
            throw e;
        }
        creadaEnOnvo[0] = onvoSub.id();
        persistirAltaOnvo(empresa, sub, plan, customerId, onvoSub.id(), priceId);
        return new AltaOnvo(customerId, onvoSub.id(), true);
    }

    /** Timeout / red caída: {@code ResourceAccessException}, aunque el breaker la haya envuelto en su fallback. */
    private static boolean esErrorDeRed(Throwable e) {
        for (int i = 0; e != null && i < 5; i++, e = e.getCause()) {
            if (e instanceof org.springframework.web.client.ResourceAccessException) return true;
        }
        return false;
    }

    /**
     * Reconciliación: cancela en ONVO una suscripción que no quedó guardada. Mejor esfuerzo; si falla, alerta sin PII.
     * L1: antes del DELETE se vuelve a mirar en una transacción NUEVA si la fila sí quedó guardada (p. ej. el commit
     * llegó a la base y el error vino después): cancelar una suscripción guardada le quitaría el trial a un cliente.
     */
    private void cancelarHuerfana(Long empresaId, String onvoSubId, RuntimeException causa) {
        Boolean guardada = estaGuardada(onvoSubId);
        if (guardada == null) {
            log.error("[ALERTA-PAGO] [onvo-alta] no se pudo verificar si la suscripción ONVO quedó guardada; NO se cancela."
                    + " Revisarla a mano en ONVO empresa_id={} sub={} causa={}",
                empresaId, onvoSubId, causa.getClass().getSimpleName());
            return;
        }
        if (guardada) {
            log.warn("[ALERTA-PAGO] [onvo-alta] la suscripción ONVO sí quedó guardada; NO se cancela empresa_id={} sub={} causa={}",
                empresaId, onvoSubId, causa.getClass().getSimpleName());
            return;
        }
        log.warn("[ALERTA-PAGO] [onvo-alta] suscripción ONVO no guardada, se cancela empresa={} sub={} causa={}",
            empresaId, onvoSubId, causa.getClass().getSimpleName());
        try {
            onvoBilling.cancelarInmediato(onvoSubId);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] [onvo-alta] NO se pudo cancelar la suscripción ONVO huérfana empresa={} sub={} causa={} status={}"
                    + " — cancelarla a mano en ONVO",
                empresaId, onvoSubId, e.getClass().getSimpleName(), OnvoBillingClient.statusDe(e));
        }
    }

    /** {@code true} si hay una fila con ese id, {@code false} si no, {@code null} si no se pudo verificar. Transacción nueva. */
    private Boolean estaGuardada(String onvoSubId) {
        try {
            if (tx == null) {
                return suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).isPresent();
            }
            TransactionTemplate nueva = new TransactionTemplate(tx.getTransactionManager());
            nueva.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            nueva.setReadOnly(true);
            return nueva.execute(status -> suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).isPresent());
        } catch (RuntimeException e) {
            return null;
        }
    }

    private String resolverPriceId(String planNombre) {
        String priceId = onvoBilling.getPriceIdForPlan(planNombre);
        if (priceId == null && !caminoMock()) {
            // Fail-closed: sin el price del plan no se crea ni se cambia nada en ONVO.
            log.error("[ALERTA-PAGO] [onvo] falta ONVO_PRICE_ID_{} en la configuración; no se puede cobrar ese plan",
                planNombre);
            throw new com.hotclick.exception.PriceIdOnvoFaltanteException(planNombre);
        }
        return priceId != null ? priceId : "price_mock_" + planNombre;
    }

    private Map<String, Object> bajarAGratis(Long empresaId, Suscripcion sub) {
        if (sub == null || sub.getOnvoSubscriptionId() == null || sub.getOnvoSubscriptionId().isBlank()) {
            self.aplicarPlanLocal(empresaId, PLAN_GRATIS, null);
            return Map.of("status", "activado", "planNombre", PLAN_GRATIS);
        }
        // Fail-closed ANTES de llamar a ONVO: si falta PLANES_MONEDA el ledger de la baja no se podría escribir y la
        // operación se revertiría localmente después de haber cancelado en ONVO (cancelación huérfana).
        if (ledgerWriter != null) monedaLedgerOFalla("CANCELACION");
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

    /**
     * ALTO-02b: ONVO no tiene un endpoint para cambiar el price de una suscripción (el PATCH de items edita items
     * adicionales y rechaza priceId; el POST de actualizar no acepta items). Se decide con el estado real en ONVO:
     * <ul>
     *   <li>el price ya es el pedido: no se llama a ONVO; si falta cobrar, se devuelve el cobro pendiente;</li>
     *   <li>la suscripción nunca se cobró (incomplete, incomplete_expired, trialing): se cancela en ONVO y se crea una
     *       nueva con {@code items[].priceId} (lo único que documenta ONVO);</li>
     *   <li>ya cobrada (active, past_due, unpaid...): fail-closed, 422 sin tocar nada.</li>
     * </ul>
     */
    private Map<String, Object> cambiarPlanExistente(Long empresaId, Empresa empresa, Suscripcion sub,
                                                     Plan planDestino, String priceId) {
        if (caminoMock()) {
            self.guardarOnvoPricePendiente(empresaId, planDestino, priceId);
            self.aplicarPlanLocal(empresaId, planDestino.getNombre(), priceId);
            return Map.of("status", "activado", "planNombre", planDestino.getNombre(), "mock", true);
        }
        String nuevaPendiente = sub.getOnvoSubNuevaPendiente();
        if (nuevaPendiente != null && !nuevaPendiente.isBlank()) {
            // Ya hay una subida creada sin pagar: se reabre la misma; nunca se crea una segunda suscripción.
            if (PLAN_NEGOCIO_PLUS.equalsIgnoreCase(planDestino.getNombre())) {
                return respuestaRequierePago(empresa, planDestino, sub.getOnvoCustomerId(), nuevaPendiente);
            }
            throw new com.hotclick.exception.OnvoSolicitudRechazadaException(
                "Tenés una subida a Negocio Plus pendiente de pago. Completala o esperá a que venza para hacer otro cambio.", null);
        }
        String onvoSubId = sub.getOnvoSubscriptionId();
        Map<?, ?> enOnvo = onvoBilling.obtenerSuscripcion(onvoSubId);
        String estado = OnvoBillingClient.estadoDe(enOnvo);
        String priceActual = OnvoBillingClient.primerPriceId(enOnvo);
        if (priceId.equals(priceActual) && !"incomplete_expired".equals(estado)) {
            // Idempotente: el ítem ya tiene el price pedido; no se repite ninguna llamada de cambio.
            self.guardarOnvoPricePendiente(empresaId, planDestino, priceId);
            if (requiereCobro(enOnvo)) {
                return respuestaRequierePago(empresa, planDestino, sub.getOnvoCustomerId(), onvoSubId);
            }
            return Map.of(
                "status", "actualizando",
                "mensaje", "Tu plan ya está en ONVO; se activa cuando se confirme el cobro"
            );
        }
        if ("trialing".equals(estado) && OnvoBillingClient.tieneMetodoPago(enOnvo)) {
            // Seguridad: con tarjeta, ONVO cobra al terminar el trial; si cancelar la vieja fallara habría doble cobro.
            log.warn("[onvo] cambio de plan en trial con método de pago: no se reemplaza empresa={}", empresaId);
            throw new com.hotclick.exception.TrialConMetodoPagoException();
        }
        if (estado != null && ESTADOS_SIN_COBRO.contains(estado)) {
            return reemplazarSuscripcion(empresaId, empresa, sub, planDestino, priceId, estado, enOnvo, false);
        }
        if ("active".equals(estado) && esSubidaANegocioPlus(nombrePlanActual(empresa), planDestino.getNombre())) {
            // Única subida que la pyme hace sola: precio completo hoy, sin prorrateo, período nuevo desde hoy.
            return reemplazarSuscripcion(empresaId, empresa, sub, planDestino, priceId, estado, enOnvo, true);
        }
        // Bajar de plan o cualquier otro cambio sobre una suscripción cobrada: no se toca ONVO; va por solicitud.
        log.warn("[onvo] cambio de plan sobre una suscripción ya cobrada: requiere solicitud empresa={} estado={}",
            empresaId, estado);
        throw new com.hotclick.exception.CambioPlanRequiereSolicitudException();
    }

    static final String PLAN_NEGOCIO_PLUS = "NEGOCIO_PLUS";
    private static final java.util.List<String> ORDEN_PLANES = java.util.List.of(PLAN_GRATIS, "PYME", PLAN_NEGOCIO_PLUS);

    /** Rango del plan (EMPRENDEDOR 0, PYME 1, NEGOCIO_PLUS 2); -1 si no es uno de esos. */
    static int rangoPlan(String nombre) {
        return nombre == null ? -1 : ORDEN_PLANES.indexOf(nombre.toUpperCase(java.util.Locale.ROOT));
    }

    /** Solo subir a NEGOCIO_PLUS desde un plan conocido más bajo. */
    static boolean esSubidaANegocioPlus(String actual, String destino) {
        int a = rangoPlan(actual);
        return PLAN_NEGOCIO_PLUS.equalsIgnoreCase(destino) && a >= 0 && a < rangoPlan(PLAN_NEGOCIO_PLUS);
    }

    /** Estados ONVO en los que todavía no se cobró ningún período: se puede reemplazar sin perder nada pagado. */
    static final java.util.Set<String> ESTADOS_SIN_COBRO = java.util.Set.of("incomplete", "incomplete_expired", "trialing");

    /** Trial de ONVO sin método de pago guardado. */
    static boolean trialSinMetodo(Map<?, ?> enOnvo) {
        return "trialing".equals(OnvoBillingClient.estadoDe(enOnvo)) && !OnvoBillingClient.tieneMetodoPago(enOnvo);
    }

    /** Falta cobrar la primera factura, o el trial no tiene método de pago: el SDK de ONVO lo completa. */
    static boolean requiereCobro(Map<?, ?> enOnvo) {
        String estado = OnvoBillingClient.estadoDe(enOnvo);
        return "incomplete".equals(estado)
            || ("trialing".equals(estado) && !OnvoBillingClient.tieneMetodoPago(enOnvo));
    }

    /**
     * Reemplazo de una suscripción ONVO nunca cobrada. Orden: PRIMERO se crea la nueva, se guarda y DESPUÉS se cancela
     * la vieja.
     * <ul>
     *   <li>Falla la creación: la vieja queda intacta (no se cancela), nada local cambia; 422 si ONVO la rechazó, 503 si
     *       no respondió.</li>
     *   <li>Falla el guardado: se cancela la nueva (huérfana) y la vieja sigue guardada.</li>
     *   <li>Falla la cancelación de la vieja: la fila ya apunta a la nueva y la vieja queda en {@code onvo_sub_por_cancelar}
     *       para revisión manual, con log enmascarado.</li>
     * </ul>
     * Trial: ONVO acepta {@code trialPeriodDays} al crear (trialStart/trialEnd son de solo lectura y {@code startDate} no
     * es compatible con allow_incomplete), así que si la vieja estaba en trialing se mandan los días que le quedan
     * (trialEnd de ONVO o, si no viene, la fecha local; hacia abajo, mínimo 0). El trial local no se toca.
     */
    private Map<String, Object> reemplazarSuscripcion(Long empresaId, Empresa empresa, Suscripcion sub,
                                                      Plan planDestino, String priceId, String estado,
                                                      Map<?, ?> enOnvo, boolean subidaCobrada) {
        String anterior = sub.getOnvoSubscriptionId();
        String customerId = sub.getOnvoCustomerId();
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalStateException("La suscripción ONVO no tiene customer guardado.");
        }
        String pendiente = sub.getOnvoSubPorCancelar();
        if (pendiente != null && !pendiente.isBlank()) {
            // Fail-closed: no se crea otra suscripción mientras una vieja siga sin cancelar en ONVO.
            log.error("[ALERTA-PAGO] [onvo] reemplazo bloqueado: hay una suscripción vieja pendiente de cancelar empresa={}", empresaId);
            throw new com.hotclick.exception.OnvoSolicitudRechazadaException(
                "Tenemos un cambio de plan anterior pendiente de cerrar. Escribinos y lo resolvemos antes de hacer otro cambio.", null);
        }
        // Subida sobre una suscripción cobrada: sin trial, ONVO cobra el precio completo al confirmar (allow_incomplete).
        int diasTrial = subidaCobrada ? 0
            : diasTrialReemplazo(empresa, sub, planDestino, estado, enOnvo, java.time.Instant.now());
        log.warn("[onvo] reemplazo de suscripción sin cobro empresa={} estado={} sub={} diasTrial={}",
            empresaId, estado, enmascarar(anterior), diasTrial);
        Map<String, String> meta = Map.of(
            "empresa_id", String.valueOf(empresaId),
            "plan_id", String.valueOf(planDestino.getId()),
            "plan_nombre", planDestino.getNombre()
        );
        OnvoBillingClient.OnvoSubscription nueva;
        try {
            nueva = diasTrial > 0
                ? onvoBilling.crearSuscripcionIncompleta(customerId, priceId, meta, diasTrial)
                : onvoBilling.crearSuscripcionIncompleta(customerId, priceId, meta);
        } catch (com.hotclick.exception.OnvoSolicitudRechazadaException e) {
            log.warn("[onvo] ONVO rechazó la suscripción nueva; la vieja queda intacta empresa={}", empresaId);
            throw e;
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] [onvo] no se pudo crear la suscripción nueva; la vieja queda intacta empresa={} causa={}",
                empresaId, e.getClass().getSimpleName());
            throw new com.hotclick.exception.ReemplazoOnvoNoDisponibleException(e);
        }
        String nuevaId = nueva.id();
        try {
            enTransaccion(() -> {
                Empresa bloqueada = bloquearEmpresa(empresaId);
                Suscripcion fila = primeraActiva(empresaId);
                if (fila == null || !anterior.equals(fila.getOnvoSubscriptionId())) {
                    throw new IllegalStateException("La suscripción ONVO cambió mientras se reemplazaba.");
                }
                if (subidaCobrada) {
                    // Dos tiempos: la vieja sigue vigente (ACTIVE, renueva, mismo plan). La nueva queda pendiente y
                    // solo cuando ONVO confirma su pago se cancela la vieja (completarReemplazoTrasPago).
                    fila.setOnvoSubNuevaPendiente(nuevaId);
                    fila.setOnvoSubNuevaDesde(java.time.LocalDateTime.now(Constants.ZONA_CR));
                    registrarPlanPendiente(fila, planDestino);
                    suscripcionRepo.save(fila);
                    return null;
                }
                fila.setOnvoSubscriptionId(null);
                persistirAltaOnvo(bloqueada, fila, planDestino, customerId, nuevaId, priceId);
                return null;
            });
        } catch (RuntimeException ex) {
            cancelarHuerfana(empresaId, nuevaId, ex);
            throw ex;
        }
        if (subidaCobrada) {
            log.info("[onvo] subida a Negocio Plus pendiente de pago empresa={} nueva={}", empresaId, enmascarar(nuevaId));
            return respuestaRequierePago(empresa, planDestino, customerId, nuevaId);
        }
        try {
            onvoBilling.cancelarInmediato(anterior);
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] [onvo] no se pudo cancelar la suscripción vieja tras el reemplazo; queda para"
                    + " revisión manual empresa={} vieja={} causa={} status={}",
                empresaId, enmascarar(anterior), e.getClass().getSimpleName(), OnvoBillingClient.statusDe(e));
            self.marcarCancelacionPendiente(empresaId, anterior);
        }
        Map<String, Object> out = respuestaRequierePago(empresa, planDestino, customerId, nuevaId);
        if (diasTrial > 0) out.put("trialDias", diasTrial);
        return out;
    }

    /** Días de trial para la suscripción nueva: los que le quedan a la vieja si estaba en trial; si no, los del Emprendedor. */
    static int diasTrialReemplazo(Empresa empresa, Suscripcion sub, Plan planDestino, String estado,
                                  Map<?, ?> enOnvo, java.time.Instant ahora) {
        // MEDIO-2: el trial local vale para cualquier plan destino.
        int emprendedor = TrialEmprendedorService.diasRestantes(empresa, LocalDate.now(Constants.ZONA_CR));
        if (!"trialing".equals(estado)) return emprendedor;
        return Math.max(emprendedor, diasTrialRestantes(enOnvo, empresa, sub, ahora));
    }

    /** trialEnd de ONVO (UTC) o, si no viene o no se entiende, la fecha local; días completos hacia abajo, mínimo 0. */
    static int diasTrialRestantes(Map<?, ?> enOnvo, Empresa empresa, Suscripcion sub, java.time.Instant ahora) {
        Object fin = enOnvo == null ? null : enOnvo.get("trialEnd");
        if (fin instanceof String s && !s.isBlank()) {
            try {
                long dias = java.time.Duration.between(ahora, java.time.Instant.parse(s)).toDays();
                return (int) Math.max(0, dias);
            } catch (java.time.format.DateTimeParseException ignored) {
                // se usa la fecha local
            }
        }
        LocalDate hoy = ahora.atZone(Constants.ZONA_CR).toLocalDate();
        int local = TrialEmprendedorService.diasRestantes(empresa, hoy);
        if (local == 0 && sub != null && sub.getTrialEnd() != null) {
            local = (int) Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(hoy, sub.getTrialEnd()));
        }
        return local;
    }

    /** Deja la suscripción ONVO vieja marcada para cancelarla a mano. Mejor esfuerzo: si falla, solo log. */
    @Transactional
    public void marcarCancelacionPendiente(Long empresaId, String onvoSubVieja) {
        try {
            suscripcionRepo.findActivaByEmpresaId(empresaId).ifPresent(s -> {
                s.setOnvoSubPorCancelar(onvoSubVieja);
                s.setOnvoRevisionManualDesde(java.time.LocalDateTime.now(Constants.ZONA_CR));
                suscripcionRepo.save(s);
            });
        } catch (RuntimeException e) {
            log.error("[ALERTA-PAGO] [onvo] no se pudo marcar la revisión manual empresa={} vieja={} causa={}",
                empresaId, enmascarar(onvoSubVieja), e.getClass().getSimpleName());
        }
    }

    /** Id enmascarado para logs: solo los últimos 4 caracteres. */
    static String enmascarar(String id) {
        if (id == null || id.length() <= 4) return "****";
        return "****" + id.substring(id.length() - 4);
    }

    /**
     * «Completar pago» del aviso de plan pendiente: si la suscripción ONVO está incomplete (primera factura sin cobrar)
     * o en trial sin método de pago, devuelve los datos para abrir el SDK de ONVO con {@code paymentType: subscription}
     * (https://docs.onvopay.com/integrations/sdk). No cambia precios ni crea nada. Sin nada que cobrar, {@code
     * sin_pago_pendiente} y el panel lleva a la pantalla de planes.
     */
    public Map<String, Object> completarPago(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
        if (SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())) {
            throw new IllegalStateException(SuspensionImpago.MSG_SOLO_PAGO);
        }
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId).orElse(null);
        if (!tieneOnvoGuardado(sub) || caminoMock()) {
            return Map.of("status", "sin_pago_pendiente");
        }
        Map<?, ?> enOnvo = onvoBilling.obtenerSuscripcion(sub.getOnvoSubscriptionId());
        if (!requiereCobro(enOnvo)) {
            return Map.of("status", "sin_pago_pendiente");
        }
        // El plan sale del price que confirma ONVO, nunca de lo guardado localmente.
        String planNombre = onvoBilling.planParaPriceId(OnvoBillingClient.primerPriceId(enOnvo));
        if (planNombre == null) {
            log.error("[ALERTA-PAGO] completarPago: el price de la suscripción ONVO no corresponde a ningún plan"
                + " configurado empresa={}", empresaId);
            throw new IllegalStateException("Price ONVO desconocido");
        }
        Plan plan = planRepo.findByNombre(planNombre)
            .orElseThrow(() -> new IllegalStateException("Plan no encontrado: " + planNombre));
        // MEDIO-1: si la factura del período actual ya está paid, no se vuelve a pedir el pago (el plan lo activa el
        // webhook o la reconciliación).
        // QA #536: en trialing sin método la factura del período es la de $0 del trial (paid) y aun así falta guardar
        // la tarjeta: ese caso SIEMPRE devuelve requiere_pago para abrir el SDK.
        if (!trialSinMetodo(enOnvo) && "paid".equalsIgnoreCase(OnvoBillingVerificador.texto(
                onvoBilling.obtenerFacturaDelPeriodoActual(enOnvo), "status"))) {
            return Map.of("status", "sin_pago_pendiente");
        }
        // MEDIO-2: suscripción incomplete creada SIN trial mientras al negocio le quedan días de trial local. Pagarla
        // cobraría ya y perdería esos días. ONVO solo acepta trialPeriodDays al crear (trialStart/trialEnd son de solo
        // lectura): se reemplaza por una nueva en trialing con los días que le quedan (sin cobro) y el SDK solo guarda
        // la tarjeta; ONVO cobra al terminar el trial.
        int diasLocales = TrialEmprendedorService.diasRestantes(empresa, LocalDate.now(Constants.ZONA_CR));
        if ("incomplete".equals(OnvoBillingClient.estadoDe(enOnvo)) && diasLocales > 0) {
            String priceId = OnvoBillingClient.primerPriceId(enOnvo);
            log.warn("[onvo] completarPago: suscripción sin trial con {} día(s) de trial local; se reemplaza empresa={}",
                diasLocales, empresaId);
            return reemplazarSuscripcion(empresaId, empresa, sub, plan, priceId, "incomplete", enOnvo, false);
        }
        return respuestaRequierePago(empresa, plan, sub.getOnvoCustomerId(), sub.getOnvoSubscriptionId());
    }

    private Map<String, Object> altaPlanPago(Long empresaId, Empresa empresa, Plan planDestino,
                                             String priceId, Suscripcion subExistente) {
        // Trial Emprendedor: ONVO no cobra durante los días que le quedan y después cobra US$9 cada mes en automático.
        // MEDIO-2: los días de trial que le quedan al negocio se conservan para CUALQUIER plan pago (antes solo
        // Emprendedor): una pyme en trial que elige otro plan no puede perderlos ni pagar de inmediato.
        int diasTrial = TrialEmprendedorService.diasRestantes(empresa, LocalDate.now(Constants.ZONA_CR));
        // M1: misma garantía que el trial: el lock del negocio decide quién crea; la otra llamada reutiliza el id guardado.
        AltaOnvo alta = altaOnvoUnica(empresaId, empresa, subExistente, planDestino, priceId, diasTrial);

        if (caminoMock()) {
            self.aplicarPlanLocal(empresaId, planDestino.getNombre(), priceId);
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("status", "activado");
            out.put("planNombre", planDestino.getNombre());
            out.put("mock", true);
            return out;
        }

        Map<String, Object> out = respuestaRequierePago(empresa, planDestino, alta.customerId(), alta.subscriptionId());
        if (diasTrial > 0) out.put("trialDias", diasTrial);
        return out;
    }

    private Map<String, Object> respuestaRequierePago(Empresa empresa, Plan planDestino,
                                                      String customerId, String subscriptionId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "requiere_pago");
        out.put("subscriptionId", subscriptionId);
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

    /**
     * Guarda el alta ONVO sobre la suscripción del negocio (o crea la fila). NUNCA pisa un {@code onvoSubscriptionId}
     * existente: si ya hay uno distinto aborta (la transacción se revierte y el llamador cancela la recién creada en
     * ONVO). Corre dentro del lock de fila del negocio.
     */
    private void persistirAltaOnvo(Empresa empresa, Suscripcion existente, Plan plan, String customerId,
                                   String subscriptionId, String priceId) {
        if (existente != null && existente.getOnvoSubscriptionId() != null
            && !existente.getOnvoSubscriptionId().isBlank()
            && !existente.getOnvoSubscriptionId().equals(subscriptionId)) {
            log.warn("[ALERTA-PAGO] [onvo-alta] no se pisa la suscripción ONVO existente empresa={} existente={} nueva={}",
                empresa.getId(), existente.getOnvoSubscriptionId(), subscriptionId);
            throw new IllegalStateException("El negocio ya tiene una suscripción ONVO. No se guardó la nueva.");
        }
        Suscripcion sub = existente != null ? existente : new Suscripcion();
        if (existente == null) {
            sub.setEmpresa(empresa);
            sub.setEstado("TRIAL");
            sub.setFechaInicio(LocalDate.now(Constants.ZONA_CR));
            // QA3-023: la fila nueva arranca con el plan vigente del negocio, no con el elegido sin pagar.
            sub.setPlan(planVigente(empresa, plan));
        }
        registrarPlanPendiente(sub, plan);
        sub.setOnvoCustomerId(customerId);
        sub.setOnvoSubscriptionId(subscriptionId);
        sub.setOnvoPriceId(priceId);
        // H1 (fail-closed): durante el trial Emprendedor la fila lleva fecha_fin = último día del trial. Sin ella, si
        // el cobro falla la fila pasaría a PAST_DUE sin fecha y el job de impago (filtra por fecha_fin) nunca la cerraría.
        if (sub.getFechaFin() == null && TrialEmprendedorService.tuvoTrial(empresa)
            && empresa.getTrialEmprendedorHasta() != null) {
            sub.setFechaFin(empresa.getTrialEmprendedorHasta());
        }
        suscripcionRepo.save(sub);
    }

    @Transactional
    public void guardarOnvoPricePendiente(Long empresaId, Plan plan, String priceId) {
        Suscripcion sub = suscripcionRepo.findActivaByEmpresaId(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción activa", empresaId));
        // QA3-023: el plan vigente no cambia hasta el webhook ONVO verificado; el nuevo queda pendiente.
        registrarPlanPendiente(sub, plan);
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
        sub.setPlanPendiente(null);
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
     * B2: {@code referenciaLedger} es el id de la factura de ONVO (una por cobro) y es obligatorio: no hay sobrecarga
     * sin referencia ni caída al id de la suscripción, que volvería a deduplicar el ledger por suscripción.
     */
    @Transactional
    public void procesarPagoOnvoVerificado(String onvoSubId, String planNombre, LocalDate fin, String referenciaLedger) {
        if (!referenciaValida(referenciaLedger)) {
            throw new IllegalArgumentException("Referencia de ledger ONVO inválida: se requiere el id de la factura");
        }
        if (ignorarPagoDeSuscripcionVieja(onvoSubId)) return;
        Optional<Suscripcion> vigente = suscripcionRepo.findByOnvoSubscriptionIdForUpdate(onvoSubId);
        Optional<Suscripcion> pendiente = vigente.isPresent() ? Optional.empty()
            : suscripcionRepo.findByOnvoSubNuevaPendienteForUpdate(onvoSubId);
        if (vigente.isEmpty() && pendiente.isEmpty()) {
            throw new RecursoNoEncontradoException("Suscripción ONVO", onvoSubId);
        }
        // MEDIO-3: webhook y reconciliación comparten este camino. Bajo el lock de fila: si esa factura ya activó
        // (COBRO_OK en el ledger), la segunda llamada no hace nada.
        if (ledgerWriter != null && ledgerWriter.yaRegistrado(referenciaLedger, BillingLedger.TIPO_COBRO_OK)) {
            log.info("[billing-onvo] Pago ONVO ya aplicado para esa factura sub={}: sin cambios", enmascarar(onvoSubId));
            return;
        }
        Plan plan = planRepo.findByNombre(planNombre)
            .orElseThrow(() -> new IllegalStateException("Plan " + planNombre + " no configurado"));
        if (fin == null) {
            log.warn("[onvo] Sin fin de período ONVO para sub={}", onvoSubId);
            throw new IllegalStateException("Sin fin de período ONVO para la suscripción");
        }
        Suscripcion sub = vigente.orElseGet(() -> completarReemplazoTrasPago(pendiente.get()));
        sub.setPlan(plan);
        // Un cobro de la vieja mientras hay una subida sin pagar no borra el plan pendiente.
        if (sub.getOnvoSubNuevaPendiente() == null) sub.setPlanPendiente(null);
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
            referenciaLedger, "Pago ONVO verificado");
        log.info("[billing-onvo] Webhook verificado activó empresa={} plan={} fin={}", empresa.getId(), plan.getNombre(), fin);
    }

    /**
     * Punto único de cancelación de la vieja al subir a Negocio Plus. Lo llama {@link #procesarPagoOnvoVerificado}
     * (webhook y cualquier reconciliación que use ese camino) con la fila ya bloqueada y el pago de la nueva verificado.
     * Idempotente: cambia el id vigente a la nueva una sola vez (el segundo webhook ya encuentra la nueva como vigente y
     * no entra acá), así la vieja se cancela una sola vez. Si cancelar la vieja falla, queda en onvo_sub_por_cancelar
     * con revisión manual; como ya no es la vigente, un cobro suyo va a {@link #ignorarPagoDeSuscripcionVieja}.
     */
    public Suscripcion completarReemplazoTrasPago(Suscripcion fila) {
        String nueva = fila.getOnvoSubNuevaPendiente();
        String vieja = fila.getOnvoSubscriptionId();
        if (nueva == null || nueva.isBlank()) return fila;
        fila.setOnvoSubscriptionId(nueva);
        fila.setOnvoSubNuevaPendiente(null);
        fila.setOnvoSubNuevaDesde(null);
        if (vieja != null && !vieja.isBlank() && !vieja.equals(nueva)) {
            fila.setOnvoSubReemplazada(vieja);
            try {
                onvoBilling.cancelarInmediato(vieja);
                log.info("[onvo] subida pagada: vieja cancelada empresa={} vieja={}",
                    fila.getEmpresa() == null ? null : fila.getEmpresa().getId(), enmascarar(vieja));
            } catch (RuntimeException e) {
                log.error("[ALERTA-PAGO] [onvo] subida pagada pero no se pudo cancelar la vieja; queda para revisión"
                        + " manual vieja={} causa={} status={}",
                    enmascarar(vieja), e.getClass().getSimpleName(), OnvoBillingClient.statusDe(e));
                fila.setOnvoSubPorCancelar(vieja);
                fila.setOnvoRevisionManualDesde(java.time.LocalDateTime.now(Constants.ZONA_CR));
            }
        }
        suscripcionRepo.save(fila);
        return fila;
    }

    /**
     * Job de subidas sin pagar: pasado el plazo, cancela en ONVO la nueva (incomplete) y limpia la fila. La vieja no se
     * toca. Si ONVO ya la reporta activa (pago con webhook en camino) o la cancelación falla, no se limpia: se reintenta.
     * Devuelve true si la expiró.
     */
    @Transactional
    public boolean expirarReemplazoPendiente(Long filaId, java.time.LocalDateTime limite) {
        Suscripcion fila = suscripcionRepo.findByIdForUpdate(filaId).orElse(null);
        if (fila == null || fila.getOnvoSubNuevaPendiente() == null || fila.getOnvoSubNuevaDesde() == null
                || !fila.getOnvoSubNuevaDesde().isBefore(limite)) {
            return false;
        }
        String nueva = fila.getOnvoSubNuevaPendiente();
        String estado = OnvoBillingClient.estadoDe(onvoBilling.obtenerSuscripcion(nueva));
        if ("active".equals(estado) || "trialing".equals(estado)) {
            log.warn("[ALERTA-PAGO] [onvo] subida vencida pero ONVO la reporta {}: no se cancela nueva={}",
                estado, enmascarar(nueva));
            return false;
        }
        if (!"canceled".equals(estado) && !"incomplete_expired".equals(estado)) {
            onvoBilling.cancelarInmediato(nueva);
        }
        fila.setOnvoSubNuevaPendiente(null);
        fila.setOnvoSubNuevaDesde(null);
        fila.setPlanPendiente(null);
        suscripcionRepo.save(fila);
        log.info("[onvo] subida a Negocio Plus sin pagar vencida y cancelada nueva={}", enmascarar(nueva));
        return true;
    }

    /**
     * BAJO (Seguridad): un pago de una suscripción ONVO vieja (reemplazada al subir a Negocio Plus o pendiente de
     * cancelar) nunca activa ni cambia el plan. Se ignora, se marca la fila para revisión manual y se alerta sin PII.
     * Solo aplica si el id ya no es el vigente de ninguna fila.
     */
    public boolean ignorarPagoDeSuscripcionVieja(String onvoSubId) {
        if (onvoSubId == null || suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).isPresent()) return false;
        if (suscripcionRepo.countConOnvoSubVieja(onvoSubId) == 0) return false;
        int marcadas = suscripcionRepo.marcarRevisionManualPorSubVieja(onvoSubId,
            java.time.LocalDateTime.now(Constants.ZONA_CR));
        log.error("[ALERTA-PAGO] [onvo] pago de una suscripción ONVO vieja (reemplazada): se ignora y queda en"
            + " revisión manual vieja={} filasMarcadas={}", enmascarar(onvoSubId), marcadas);
        return true;
    }

    /**
     * QA #536 (decisión de Andrés): ONVO confirmó por GET una suscripción {@code trialing} con método de pago guardado
     * ({@link OnvoBillingVerificador#trialConMetodo}). El plan elegido queda activo durante el trial y {@code fecha_fin}
     * = fin del trial; el primer cobro lo hace ONVO al terminar y entra por {@link #procesarPagoOnvoVerificado} (o, si
     * falla, por past_due/gracia). Webhook y reconciliación comparten este camino. Idempotente bajo el lock de fila:
     * se activa UNA sola vez por suscripción ONVO (PLAN_ACTIVADO con referencia = id de la suscripción).
     * BAJO (#535): un id que solo figura como onvo_sub_reemplazada / por_cancelar se ignora (igual que el camino de pago).
     * @return true si activó; false si ya estaba activada o se ignoró una suscripción vieja.
     */
    @Transactional
    public boolean procesarTrialOnvoVerificado(String onvoSubId, String planNombre, LocalDate finTrial) {
        if (!referenciaValida(onvoSubId)) throw new IllegalArgumentException("Id de suscripción ONVO inválido");
        if (ignorarPagoDeSuscripcionVieja(onvoSubId)) return false;
        Suscripcion sub = suscripcionRepo.findByOnvoSubscriptionIdForUpdate(onvoSubId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Suscripción ONVO", onvoSubId));
        if (ledgerWriter != null && ledgerWriter.yaRegistrado(onvoSubId, BillingLedger.TIPO_PLAN_ACTIVADO)) {
            log.info("[billing-onvo] Trial ONVO ya activado sub={}: sin cambios", enmascarar(onvoSubId));
            return false;
        }
        Plan plan = planRepo.findByNombre(planNombre)
            .orElseThrow(() -> new IllegalStateException("Plan " + planNombre + " no configurado"));
        if (finTrial == null) throw new IllegalStateException("Sin fin de trial ONVO para la suscripción");
        sub.setPlan(plan);
        // Una subida pendiente no se borra por un evento de trial de la vieja (ya filtrado arriba); sí se limpia si es la vigente.
        if (sub.getOnvoSubNuevaPendiente() == null) sub.setPlanPendiente(null);
        sub.setOnvoPriceId(onvoBilling.getPriceIdForPlan(planNombre));
        sub.setEstado("ACTIVO");
        sub.setCancelarAlVencer(false);
        sub.setTrialEnd(finTrial);
        sub.setFechaFin(finTrial);
        suscripcionRepo.save(sub);

        Empresa empresa = sub.getEmpresa();
        empresa.setPlan(plan);
        empresa.setPlanSaas(plan.getNombre());
        empresa.setEstadoPlan("ACTIVO");
        empresa.setFechaVencPlan(finTrial);
        empresaRepo.save(empresa);
        evictTenant(empresa.getId());
        anotarLedger(empresa, sub, BillingLedger.TIPO_PLAN_ACTIVADO, onvoSubId, "Plan activo en trial ONVO con método de pago");
        log.info("[billing-onvo] Trial con método activó empresa={} plan={} primerCobro={}",
            empresa.getId(), plan.getNombre(), finTrial);
        return true;
    }

    @Transactional
    public void procesarRenovacionFallida(String onvoSubId) {
        suscripcionRepo.findByOnvoSubscriptionId(onvoSubId).ifPresent(sub -> {
            sub.setEstado("PAST_DUE");
            Empresa empresa = sub.getEmpresa();
            // H1 (fail-closed): un PAST_DUE sin fecha_fin nunca lo elige el job de impago y el negocio conservaría el
            // plan para siempre. Sin fecha (suscripción de trial) se usa el fin del trial, o hoy si no hay trial.
            if (sub.getFechaFin() == null) {
                LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
                LocalDate finTrial = empresa.getTrialEmprendedorHasta();
                sub.setFechaFin(finTrial != null && finTrial.isBefore(hoy) ? finTrial : hoy);
            }
            suscripcionRepo.save(sub);
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
        // Fail-closed: sin moneda configurada no se escribe el ledger (ni cae al "crc" de la entidad) y la operación
        // se revierte y se reintenta (transitorio), en vez de dejar COBRO_FALLIDO/CANCELACION con una moneda falsa.
        String moneda = monedaLedgerOFalla(tipo);
        ledgerWriter.registrar(empresa, sub, tipo, BillingLedger.PROVEEDOR_ONVO, ref, null, moneda, detalle);
    }

    /** Moneda configurada para el ledger ONVO; sin ella lanza una excepción controlada (con alerta sin PII). */
    private String monedaLedgerOFalla(String tipo) {
        String moneda = preciosPlanes == null ? null : preciosPlanes.moneda().orElse(null);
        if (moneda == null) {
            log.error("[ALERTA-PAGO] Ledger billing ONVO sin moneda configurada, no se registra tipo={}: falta PLANES_MONEDA", tipo);
            throw new ConfigBillingFaltanteException("PLANES_MONEDA");
        }
        return moneda;
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

    /** QA3-023: pendiente solo si difiere del vigente (repagar el mismo plan no deja nada pendiente). */
    static void registrarPlanPendiente(Suscripcion sub, Plan elegido) {
        Plan vigente = sub.getPlan();
        boolean mismo = vigente != null && elegido != null && vigente.getId() != null
            && vigente.getId().equals(elegido.getId());
        sub.setPlanPendiente(mismo ? null : elegido);
    }

    /** Plan vigente del negocio (por repo, sin inicializar el proxy LAZY); si no hay, el elegido (fila NOT NULL). */
    private Plan planVigente(Empresa empresa, Plan elegido) {
        Plan actual = empresa.getPlan();
        if (actual != null && actual.getId() != null) {
            Plan p = planRepo.findById(actual.getId()).orElse(null);
            if (p != null) return p;
        }
        if (empresa.getPlanSaas() != null) {
            Plan p = planRepo.findByNombre(empresa.getPlanSaas()).orElse(null);
            if (p != null) return p;
        }
        return planRepo.findByNombre(PLAN_GRATIS).orElse(elegido);
    }

    static boolean puedeRepagarMismoPlan(Empresa empresa) {
        String e = empresa.getEstadoPlan();
        return e != null && java.util.Set.of("PAST_DUE", "VENCIDO", "TRIAL", Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA).contains(e.toUpperCase(java.util.Locale.ROOT));
    }

    private static boolean tieneStripeActivo(Suscripcion sub) {
        return sub != null
            && sub.getStripeSubscriptionId() != null
            && !sub.getStripeSubscriptionId().isBlank()
            && !sub.getStripeSubscriptionId().startsWith("sub_mock");
    }
}
