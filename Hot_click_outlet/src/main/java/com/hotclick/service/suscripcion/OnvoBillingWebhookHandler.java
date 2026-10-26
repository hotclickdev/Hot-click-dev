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
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Despacha eventos ONVO de billing SaaS.
 * Idempotencia vía hot_click_stripe_evento_tb con prefijo onvo_.
 *
 * S-02: el cuerpo del webhook solo dispara la verificación. Todo se relee por GET a ONVO
 * (renovación, payment intent, suscripción) y se exige mode = modo de la llave, estado pagado,
 * moneda CRC y monto = precio del plan del priceId que confirma ONVO. El plan nunca sale de metadata.
 * Un evento que no se puede verificar lanza {@link EventoBillingRechazado} (el controlador responde 5xx
 * y ONVO reintenta); no se marca como procesado.
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";

    /** Evento de billing que no pasó la verificación contra ONVO. */
    public static class EventoBillingRechazado extends RuntimeException {
        public EventoBillingRechazado(String m) { super(m); }
    }

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;
    private final OnvoBillingClient onvo;
    private final PlanRepository planRepo;
    private final SuscripcionRepository suscripcionRepo;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService,
                                     OnvoBillingClient onvo,
                                     PlanRepository planRepo,
                                     SuscripcionRepository suscripcionRepo) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
        this.onvo = onvo;
        this.planRepo = planRepo;
        this.suscripcionRepo = suscripcionRepo;
    }

    /**
     * @return true si el evento era de billing SaaS (aunque ya estuviera procesado).
     */
    @Transactional(noRollbackFor = EventoBillingRechazado.class)
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data) && !esIntentDeClienteBilling(type, data)) {
            return false;
        }
        String eventId = eventIdParaIdempotencia(type, data, eventIdRaw);
        if (Boolean.TRUE.equals(
            eventoRepo.findByIdForUpdate(eventId).map(StripeEvento::getProcesadoOk).orElse(null))) {
            log.info("[onvo-billing] Evento ya procesado — ignorando: {}", eventId);
            return true;
        }
        if (eventoRepo.findById(eventId).isEmpty()) {
            StripeEvento ev = new StripeEvento();
            ev.setStripeEventId(eventId);
            ev.setTipo(type);
            eventoRepo.save(ev);
        }
        try {
            despachar(type, data);
            marcar(eventId, true, null);
        } catch (RuntimeException e) {
            marcar(eventId, false, e.getMessage());
            throw e;
        }
        return true;
    }

    private void marcar(String eventId, boolean ok, String error) {
        eventoRepo.findById(eventId).ifPresent(ev -> {
            ev.setProcesadoOk(ok);
            ev.setFechaProcesado(LocalDateTime.now(Constants.ZONA_CR));
            ev.setError(error);
            eventoRepo.save(ev);
        });
    }

    private void despachar(String type, JsonNode data) {
        switch (type) {
            case "subscription.renewal.succeeded",
                 "subscription.payment_succeeded",
                 "invoice.payment_succeeded" -> activarRenovacion(data);
            case "payment-intent.succeeded" -> activarAltaPorIntent(data);
            case "subscription.renewal.failed",
                 "invoice.payment_failed" -> {
                String subId = exigir(subIdDeEvento(data), "subscriptionId");
                Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
                if (!OnvoBillingVerificador.modoCoincide(sub, onvo.modoEsperado())) {
                    throw rechazo("modo", subId);
                }
                if (OnvoBillingVerificador.estadoConfirmado(sub, subId, onvo.modoEsperado(), "canceled")) {
                    // S-03: ONVO no manda evento de cancelación; se detecta por GET.
                    suscripcionService.procesarSuscripcionOnvoEliminada(subId);
                } else if (OnvoBillingVerificador.estadoConfirmado(sub, subId, onvo.modoEsperado(),
                        "past_due", "unpaid", "incomplete")) {
                    suscripcionService.procesarRenovacionOnvoFallida(subId);
                } else {
                    log.warn("[onvo-billing] renewal.failed pero ONVO reporta sub={} status={}: sin cambios",
                        subId, sub.get("status"));
                }
            }
            // S-03: ONVO no manda eventos de cancelación; se detecta por GET (renewal.failed y job de
            // renovación) o con la respuesta de la cancelación. Un evento así se ignora.
            default -> log.debug("[onvo-billing] Evento billing ignorado: {}", type);
        }
    }

    private void activarRenovacion(JsonNode data) {
        String invoiceId = exigir(textOrNull(data, "id"), "id");
        String subId = exigir(subIdDeEvento(data), "subscriptionId");
        Map<?, ?> invoice = onvo.obtenerRenovacion(invoiceId);
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.renovacion(
            invoice, sub, invoiceId, subId, onvo.modoEsperado(), onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) throw rechazo(r.motivo(), subId);
        suscripcionService.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
    }

    /**
     * Alta: el intent se relee por GET. La empresa NO sale de metadata: se resuelve por subscriptionId
     * contra onvo_subscription_id local (con lock) y, de respaldo, por el customerId que confirma ONVO.
     */
    private void activarAltaPorIntent(JsonNode data) {
        String intentId = exigir(textOrNull(data, "id"), "id");
        Map<?, ?> intent = onvo.obtenerPaymentIntent(intentId);
        Suscripcion local = resolverLocal(subIdDeEvento(data), OnvoBillingVerificador.texto(intent, "customerId"));
        if (local == null) throw rechazo("sin_suscripcion_local", intentId);
        String subId = local.getOnvoSubscriptionId();
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.altaPorIntent(
            intent, sub, intentId, subId, onvo.modoEsperado(), onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) throw rechazo(r.motivo(), subId);
        suscripcionService.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
    }

    /** Por subscriptionId (lock); si no viene, por customerId, que tiene que ser de una sola suscripción. */
    Suscripcion resolverLocal(String subId, String customerId) {
        if (subId != null) {
            return suscripcionRepo.findByOnvoSubscriptionIdForUpdate(subId).orElse(null);
        }
        if (customerId == null) return null;
        java.util.List<Suscripcion> l = suscripcionRepo.findByOnvoCustomerIdForUpdate(customerId);
        return l.size() == 1 ? l.get(0) : null;
    }

    private Integer precioPlan(String nombre) {
        return planRepo.findByNombre(nombre).map(Plan::getPrecioMensual).orElse(null);
    }

    private static EventoBillingRechazado rechazo(String motivo, String ref) {
        log.error("[ALERTA-PAGO] Evento billing ONVO rechazado motivo={} ref={}", motivo, ref);
        return new EventoBillingRechazado("Evento billing ONVO no verificado: " + motivo);
    }

    private static String exigir(String valor, String campo) {
        if (valor == null) throw rechazo("falta_" + campo, "?");
        return valor;
    }

    /** Respaldo sin subscriptionId: el intent es de billing si su customerId es de una suscripción local. */
    private boolean esIntentDeClienteBilling(String type, JsonNode data) {
        if (!"payment-intent.succeeded".equals(type)) return false;
        String cid = textOrNull(data, "customerId");
        return cid != null && !suscripcionRepo.findByOnvoCustomerIdForUpdate(cid).isEmpty();
    }

    static boolean esEventoBilling(String type, JsonNode data) {
        if (type == null) return false;
        if (type.startsWith("subscription.") || type.startsWith("invoice.")) {
            return true;
        }
        // Un intent es de billing si trae subscriptionId (no se usa metadata para decidir la empresa).
        return "payment-intent.succeeded".equals(type) && subIdDeEvento(data) != null;
    }

    /** Solo campos explícitos de suscripción; nunca data.id (que es la renovación o el intent). */
    private static String subIdDeEvento(JsonNode data) {
        String id = textOrNull(data, "subscriptionId");
        if (id != null) return id;
        id = textOrNull(data, "subscription_id");
        if (id != null) return id;
        JsonNode sub = data.path("subscription");
        if (sub.isTextual()) return sub.asText();
        if (sub.isObject()) return textOrNull(sub, "id");
        if (data.path("object").asText("").contains("subscription")) {
            return textOrNull(data, "id");
        }
        return null;
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String v = node.path(field).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    /**
     * S-04: ONVO no manda id de evento arriba. La clave sale del objeto:
     * éxitos = id de la renovación/intent; fallas = suscripción + período (invoicePeriodStart).
     */
    static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) {
            return PREFIX + eventIdRaw;
        }
        if ("subscription.renewal.failed".equals(type) || "invoice.payment_failed".equals(type)) {
            // ONVO: una falla por suscripción y período (subscriptionId + invoicePeriodStart).
            String sub = subIdDeEvento(data);
            String periodo = textOrNull(data, "invoicePeriodStart");
            if (sub == null || periodo == null) throw rechazo("falta_periodo", type);
            return PREFIX + type + "_" + sub + "_" + periodo;
        }
        String id = textOrNull(data, "id");
        if (id == null) throw rechazo("falta_id", type);
        return PREFIX + type + "_" + id;
    }
}
