package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.onvo.OnvoBillingClient.FiltroFactura;
import com.hotclick.service.onvo.OnvoBillingClient.Recurso;
import com.hotclick.utils.Constants;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Webhooks ONVO de billing SaaS, fail-closed.
 *
 * <p>Eventos documentados (https://docs.onvopay.com/webhooks, "Eventos soportados"):
 * {@code subscription.renewal.succeeded}, {@code subscription.renewal.failed} y, para el primer cobro con
 * metadata de billing, {@code payment-intent.succeeded}. Cualquier otro {@code subscription.*}/{@code invoice.*}
 * no está en la lista de ONVO y se ignora (2xx, sin cambio de estado).
 *
 * <p>Fase 1, fuera de transacción: el cuerpo solo aporta ids para consultar. Se lee en ONVO
 * (GET /v1/subscriptions/{id}, GET /v1/invoices/{id} — openapi l.7768 —, GET /v1/invoices?paymentIntentId,
 * GET /v1/payment-intents/{id}) y se decide con esa respuesta. Fallo/timeout, 404 (ONVO puede no haber indexado
 * aún el objeto) o estado aún no final → {@link CobroNoVerificadoException} → 5xx → ONVO reintenta, sin tocar la BD.
 * <p>Solo se acepta la renovación vigente: la {@code latestInvoice} de la suscripción o una cuyo período coincida
 * con {@code currentPeriodStart/End}. El plan vence en {@code Invoice.periodEnd} (R-1: una factura paid vieja no
 * extiende nada).
 * <p>Fase 2, transacción corta: FOR UPDATE del evento, reserva atómica de la clave del cobro
 * (INSERT ... ON CONFLICT DO NOTHING, se mira cuántas filas insertó), FOR UPDATE de la Suscripcion local y
 * revalidación de su estado antes de aplicar (R-2).
 * Rechazos definitivos (falsificación, ajeno, monto distinto…) → 2xx + alerta en log y métrica
 * {@code onvo_billing_rechazo_total{motivo}}, y el evento queda registrado para no reprocesarse.
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";
    static final String PREFIX_COBRO = "onvo_cobro_";

    static final String RENOVACION_OK = "subscription.renewal.succeeded";
    static final String RENOVACION_FALLIDA = "subscription.renewal.failed";
    static final String INTENT_OK = "payment-intent.succeeded";
    static final Set<String> DOCUMENTADOS = Set.of(RENOVACION_OK, RENOVACION_FALLIDA);

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;
    private final OnvoBillingClient onvoBilling;
    private final SuscripcionRepository suscripcionRepo;
    private final PlanRepository planRepo;
    private final TransactionOperations tx;
    private final MeterRegistry metrics;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService,
                                     OnvoBillingClient onvoBilling,
                                     SuscripcionRepository suscripcionRepo,
                                     PlanRepository planRepo,
                                     TransactionOperations tx,
                                     MeterRegistry metrics) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
        this.onvoBilling = onvoBilling;
        this.suscripcionRepo = suscripcionRepo;
        this.planRepo = planRepo;
        this.tx = tx;
        this.metrics = metrics;
    }

    /** ONVO no confirmó todavía (GET fallido, timeout o estado no final): no se cambia nada y ONVO reintenta. */
    public static class CobroNoVerificadoException extends RuntimeException {
        public CobroNoVerificadoException(String motivo) { super(motivo); }
    }

    /** Lo que se aplica en la fase 2, decidido solo con respuestas de ONVO. */
    sealed interface Decision {
        record Activar(Long empresaId, String subId, Long planId, String claveCobro, LocalDate finPeriodo)
            implements Decision {}
        /** {@code finPeriodoOnvo}: currentPeriodEnd de la sub en ONVO (fecha CR), null si no vino. */
        record EnMora(String subId, LocalDate finPeriodoOnvo) implements Decision {}
        record Terminada(String subId) implements Decision {}
        record Nada(String motivo, boolean alerta) implements Decision {}
    }

    /** @return true si el evento es del ámbito billing SaaS (aunque se ignore o ya estuviera procesado). */
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data)) {
            return false;
        }
        String eventId = eventIdParaIdempotencia(type, data, eventIdRaw);
        if (eventId == null) {
            rechazo(type, "sin_id", true);
            return true;
        }
        if (yaProcesado(eventId)) {
            log.info("[onvo-billing] Evento ya procesado — ignorado");
            return true;
        }

        Decision d = decidir(type, data); // fase 1: GETs a ONVO, sin transacción abierta
        if (d instanceof Decision.Nada n) {
            rechazo(type, n.motivo(), n.alerta());
        }
        tx.executeWithoutResult(st -> aplicar(type, eventId, d)); // fase 2
        return true;
    }

    // ── Fase 1 ──────────────────────────────────────────────────────────────────────────

    private Decision decidir(String type, JsonNode data) {
        if (!DOCUMENTADOS.contains(type) && !INTENT_OK.equals(type)) {
            return new Decision.Nada("evento_no_documentado", false);
        }
        return switch (type) {
            case RENOVACION_OK -> decidirRenovacionOk(data);
            case RENOVACION_FALLIDA -> decidirRenovacionFallida(data);
            default -> decidirPrimerCobro(data);
        };
    }

    /** renewal.succeeded: data.id es la renovación (invoice); data.subscriptionId su cargo recurrente. */
    private Decision decidirRenovacionOk(JsonNode data) {
        String invId = textOrNull(data, "id");
        String subId = textOrNull(data, "subscriptionId");
        if (invId == null || subId == null) return new Decision.Nada("sin_id", true);
        Map<?, ?> sub = existente(leer(Recurso.SUSCRIPCION, subId), "suscripcion_inexistente_en_onvo");
        // GET /v1/invoices/{id} (openapi l.7768): la renovación del evento, leída por su id.
        Map<?, ?> inv = existente(leer(Recurso.FACTURA, invId), "renovacion_inexistente_en_onvo");
        if (!invId.equals(OnvoBillingVerificador.texto(inv, "id"))) return new Decision.Nada("ids_inconsistentes", true);
        return verificarCobro(sub, inv);
    }

    /** Primer cobro: payment-intent.succeeded con metadata de billing (solo clasifica; no decide nada). */
    private Decision decidirPrimerCobro(JsonNode data) {
        String piId = textOrNull(data, "id");
        if (piId == null) return new Decision.Nada("sin_id", true);
        Map<?, ?> pi = existente(leer(Recurso.PAYMENT_INTENT, piId), "intent_inexistente_en_onvo");
        if (!OnvoBillingVerificador.intentExitoso(pi)) {
            throw new CobroNoVerificadoException("intención no exitosa en ONVO");
        }
        Map<?, ?> inv = existente(buscarFactura(FiltroFactura.PAYMENT_INTENT, piId, null), "renovacion_inexistente_en_onvo");
        if (!piId.equals(OnvoBillingVerificador.texto(inv, "paymentIntentId"))) {
            return new Decision.Nada("ids_inconsistentes", true);
        }
        String subId = OnvoBillingVerificador.texto(inv, "subscriptionId");
        if (subId == null) return new Decision.Nada("ids_inconsistentes", true);
        Map<?, ?> sub = existente(leer(Recurso.SUSCRIPCION, subId), "suscripcion_inexistente_en_onvo");
        return verificarCobro(sub, inv);
    }

    private Decision verificarCobro(Map<?, ?> sub, Map<?, ?> inv) {
        String subId = OnvoBillingVerificador.texto(sub, "id");
        String invId = OnvoBillingVerificador.texto(inv, "id");
        if (!OnvoBillingVerificador.facturaPagada(inv)) {
            throw new CobroNoVerificadoException("renovación no pagada en ONVO");
        }
        if (!OnvoBillingVerificador.suscripcionActiva(sub)) {
            throw new CobroNoVerificadoException("suscripción no activa en ONVO");
        }
        if (subId == null || invId == null || !subId.equals(OnvoBillingVerificador.texto(inv, "subscriptionId"))) {
            return new Decision.Nada("ids_inconsistentes", true);
        }
        Optional<Suscripcion> local = suscripcionLocal(subId, sub);
        if (local.isEmpty()) return new Decision.Nada("suscripcion_ajena", true);
        String customerInv = OnvoBillingVerificador.texto(inv, "customerId");
        if (customerInv != null && !customerInv.equals(local.get().getOnvoCustomerId())) {
            return new Decision.Nada("suscripcion_ajena", true);
        }
        String planNombre = onvoBilling.planParaPriceId(OnvoBillingVerificador.priceId(sub));
        Optional<Plan> plan = planNombre == null ? Optional.empty() : planRepo.findByNombre(planNombre);
        if (plan.isEmpty()) return new Decision.Nada("precio_desconocido", true);
        if (!OnvoBillingVerificador.coincide(plan.get().getPrecioMensual(),
                OnvoBillingVerificador.total(inv), OnvoBillingVerificador.texto(inv, "currency"))) {
            return new Decision.Nada("monto_o_moneda_distintos", true);
        }
        // R-1: solo la renovación vigente. Una factura paid de otro período no extiende el plan.
        if (!OnvoBillingVerificador.esRenovacionVigente(sub, inv)) {
            return new Decision.Nada("renovacion_no_vigente", true);
        }
        LocalDate fin = OnvoBillingVerificador.fechaCr(OnvoBillingVerificador.texto(inv, "periodEnd"));
        if (fin == null) return new Decision.Nada("periodo_desconocido", true);
        return new Decision.Activar(local.get().getEmpresa().getId(), subId, plan.get().getId(),
            claveCobro(subId, "inv_" + invId), fin);
    }

    /**
     * renewal.failed: no se cree el cuerpo (subscriptionStatus/invoiceStatus). Se lee la suscripción en ONVO
     * y solo su status decide: past_due/unpaid → mora; canceled/incomplete_expired → baja; otro → nada.
     */
    private Decision decidirRenovacionFallida(JsonNode data) {
        String subId = textOrNull(data, "subscriptionId");
        if (subId == null) return new Decision.Nada("sin_id", true);
        Map<?, ?> sub = existente(leer(Recurso.SUSCRIPCION, subId), "suscripcion_inexistente_en_onvo");
        if (!subId.equals(OnvoBillingVerificador.texto(sub, "id"))) return new Decision.Nada("ids_inconsistentes", true);
        if (suscripcionLocal(subId, sub).isEmpty()) return new Decision.Nada("suscripcion_ajena", true);
        String st = OnvoBillingVerificador.estado(sub);
        if (OnvoBillingVerificador.SUB_EN_MORA.contains(st)) return new Decision.EnMora(subId,
            OnvoBillingVerificador.fechaCr(OnvoBillingVerificador.texto(sub, "currentPeriodEnd")));
        if (OnvoBillingVerificador.SUB_TERMINADA.contains(st)) return new Decision.Terminada(subId);
        return new Decision.Nada("suscripcion_al_dia_en_onvo", false);
    }

    /** Suscripción registrada localmente con el mismo customer que ONVO devuelve. */
    private Optional<Suscripcion> suscripcionLocal(String subId, Map<?, ?> sub) {
        Optional<Suscripcion> local = suscripcionRepo.findByOnvoSubscriptionId(subId);
        String customer = OnvoBillingVerificador.texto(sub, "customerId");
        if (local.isEmpty() || local.get().getEmpresa() == null || customer == null
            || !customer.equals(local.get().getOnvoCustomerId())) {
            return Optional.empty();
        }
        return local;
    }

    /**
     * 404 de ONVO → transitorio: un evento recién emitido puede llegar antes de que ONVO indexe el objeto.
     * 5xx y ONVO reintenta (su política de reintentos acota el número de intentos); nada se marca procesado.
     */
    private Map<?, ?> existente(Map<?, ?> obj, String motivo) {
        if (obj != null) return obj;
        log.warn("[onvo-billing] ONVO no devolvió el objeto ({}) — sin cambios, ONVO reintentará", motivo);
        metrics.counter("onvo_billing_reintento_total", "motivo", motivo).increment();
        throw new CobroNoVerificadoException("ONVO aún no devuelve el objeto");
    }

    private Map<?, ?> leer(Recurso recurso, String id) {
        try {
            return onvoBilling.obtener(recurso, id).orElse(null);
        } catch (RuntimeException e) {
            throw noDisponible(e);
        }
    }

    private Map<?, ?> buscarFactura(FiltroFactura filtro, String valor, String invId) {
        try {
            return onvoBilling.buscarFactura(filtro, valor, invId).orElse(null);
        } catch (RuntimeException e) {
            throw noDisponible(e);
        }
    }

    private CobroNoVerificadoException noDisponible(RuntimeException e) {
        log.warn("[onvo-billing] GET a ONVO falló ({}) — sin cambios, ONVO reintentará", e.getClass().getSimpleName());
        metrics.counter("onvo_billing_reintento_total").increment();
        return new CobroNoVerificadoException("ONVO no disponible para verificar");
    }

    private void rechazo(String type, String motivo, boolean alerta) {
        metrics.counter("onvo_billing_rechazo_total", "motivo", motivo).increment();
        if (alerta) {
            log.error("[ALERTA-PAGO] [onvo-billing] {} rechazado: {} — sin cambio de plan", type, motivo);
        } else {
            log.info("[onvo-billing] {} ignorado: {}", type, motivo);
        }
    }

    // ── Fase 2 ──────────────────────────────────────────────────────────────────────────

    private boolean yaProcesado(String id) {
        return Boolean.TRUE.equals(eventoRepo.findById(id).map(StripeEvento::getProcesadoOk).orElse(null));
    }

    private void aplicar(String type, String eventId, Decision d) {
        if (Boolean.TRUE.equals(eventoRepo.findByIdForUpdate(eventId).map(StripeEvento::getProcesadoOk).orElse(null))) {
            return; // otro hilo lo aplicó mientras se consultaba a ONVO
        }
        String resultado = switch (d) {
            case Decision.Activar a -> aplicarCobro(a);
            case Decision.EnMora m -> aplicarMora(m);
            case Decision.Terminada t -> {
                if (bloquearLocal(t.subId()) == null) yield "suscripcion_local_cambio";
                suscripcionService.procesarSuscripcionOnvoEliminada(t.subId());
                yield null;
            }
            case Decision.Nada n -> n.motivo();
        };
        guardar(eventId, type, resultado);
    }

    /**
     * R-2: la clave del cobro se reserva con INSERT ... ON CONFLICT DO NOTHING antes de aplicar. Con dos entregas
     * simultáneas del mismo cobro (event ids distintos) solo una inserta la fila (1); la otra espera a que la
     * primera confirme y recibe 0. Si la tx de la que aplica revierte, la reserva también y ONVO reintenta.
     */
    String aplicarCobro(Decision.Activar a) {
        if (eventoRepo.reservar(a.claveCobro(), "onvo.cobro", LocalDateTime.now(Constants.ZONA_CR)) == 0) {
            log.info("[onvo-billing] Cobro ya aplicado por otro evento — ignorado");
            return "cobro_duplicado";
        }
        Suscripcion local = bloquearLocal(a.subId());
        if (local == null || local.getEmpresa() == null || !a.empresaId().equals(local.getEmpresa().getId())) {
            // Cambió entre la fase 1 y el lock: no se aplica; la reserva se confirma con el motivo.
            return "suscripcion_local_cambio";
        }
        if (local.getFechaFin() != null && local.getFechaFin().isAfter(a.finPeriodo())
                && "ACTIVO".equals(local.getEstado())) {
            return "periodo_ya_cubierto"; // nunca acortar un vencimiento ya aplicado
        }
        suscripcionService.procesarPagoOnvoExitoso(a.empresaId(), a.subId(), a.planId(), a.finPeriodo());
        return null;
    }

    /** R-2: con la Suscripcion bloqueada, no bajar a mora si un cobro aplicado después ya cubre el período. */
    String aplicarMora(Decision.EnMora m) {
        Suscripcion local = bloquearLocal(m.subId());
        if (local == null) return "suscripcion_local_cambio";
        if ("ACTIVO".equals(local.getEstado()) && local.getFechaFin() != null && m.finPeriodoOnvo() != null
                && !local.getFechaFin().isBefore(m.finPeriodoOnvo())) {
            log.info("[onvo-billing] renewal.failed ignorado: el período ya está pagado localmente");
            return "mora_periodo_ya_cubierto";
        }
        suscripcionService.procesarRenovacionOnvoFallida(m.subId());
        return null;
    }

    private Suscripcion bloquearLocal(String subId) {
        return suscripcionRepo.findByOnvoSubscriptionIdForUpdate(subId).orElse(null);
    }

    private void guardar(String id, String tipo, String resultado) {
        StripeEvento ev = eventoRepo.findById(id).orElseGet(() -> {
            StripeEvento e = new StripeEvento();
            e.setStripeEventId(id);
            e.setTipo(tipo);
            return e;
        });
        ev.setProcesadoOk(true);
        ev.setFechaProcesado(LocalDateTime.now(Constants.ZONA_CR));
        ev.setError(resultado); // código corto de motivo; nunca mensajes ni datos del cliente
        eventoRepo.save(ev);
    }

    // ── Utilidades ──────────────────────────────────────────────────────────────────────

    /** Clave por cobro (≤100 chars de la columna; si no cabe, SHA-256). */
    static String claveCobro(String subId, String ref) {
        String clave = PREFIX_COBRO + subId + "_" + ref;
        if (clave.length() <= 100) return clave;
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(clave.getBytes(StandardCharsets.UTF_8));
            return PREFIX_COBRO + HexFormat.of().formatHex(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static boolean esEventoBilling(String type, JsonNode data) {
        if (type == null) return false;
        if (type.startsWith("subscription.") || type.startsWith("invoice.")) return true;
        return INTENT_OK.equals(type) && meta(data, "empresa_id") != null && meta(data, "plan_id") != null;
    }

    private static String meta(JsonNode data, String key) {
        JsonNode m = data == null ? null : data.path("metadata");
        if (m == null || m.isMissingNode() || m.isNull()) return null;
        String v = m.path(key).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null) return null;
        String v = node.path(field).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) return PREFIX + eventIdRaw;
        String ref = RENOVACION_FALLIDA.equals(type)
            ? Optional.ofNullable(textOrNull(data, "paymentIntentId")).orElse(textOrNull(data, "subscriptionId"))
            : textOrNull(data, "id");
        if (ref == null) return null;
        String id = PREFIX + type + "_" + ref;
        return id.length() <= 100 ? id : claveCobro(type, ref);
    }
}
