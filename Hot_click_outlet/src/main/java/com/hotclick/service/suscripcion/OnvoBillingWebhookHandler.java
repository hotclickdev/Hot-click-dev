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
        private final String motivo;
        public EventoBillingRechazado(String m) { this(m, null); }
        public EventoBillingRechazado(String m, String motivo) { super(m); this.motivo = motivo; }
        public String getMotivo() { return motivo; }
        /** M2: ONVO confirmó algo que no cuadra (modo, monto, price…): reintentar no lo arregla. */
        public boolean esPermanente() { return motivo != null && PERMANENTES.contains(motivo); }
    }

    /** M2: motivos permanentes → se registran en el ledger y se responde 200. El resto (GET caído,
     *  estado aún no pagado/activo en ONVO) sigue lanzando para que el controlador responda 5xx y ONVO reintente. */
    static final java.util.Set<String> PERMANENTES = java.util.Set.of(
        "modo", "monto", "moneda", "price_desconocido", "plan_sin_precio", "customer", "id",
        "pago_parcial", "falta_id", "falta_subscriptionId", "falta_periodo");

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
        if (!esEventoBilling(type, data)) {
            return false;
        }
        if ("payment-intent.succeeded".equals(type) && !intentAtribuibleASuscripcion(data)) {
            // M1: no se puede atribuir con certeza a una suscripción → flujo normal de checkout/POS.
            return false;
        }
        String eventId;
        try {
            eventId = eventIdParaIdempotencia(type, data, eventIdRaw, this::periodoDesdeOnvo);
        } catch (EventoBillingRechazado e) {
            if (e.esPermanente()) {
                log.error("[onvo-billing] Evento sin clave de idempotencia descartado (200): type={} motivo={}",
                    type, e.getMotivo());
                return true;
            }
            throw e;
        }
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
        } catch (EventoBillingRechazado e) {
            // B2: en el ledger va un código, nunca el mensaje de la excepción.
            marcar(eventId, false, "rechazo:" + (e.getMotivo() == null ? "desconocido" : e.getMotivo()));
            if (e.esPermanente()) return true; // M2: queda registrado y se responde 200
            throw e;
        } catch (RuntimeException e) {
            marcar(eventId, false, e.getClass().getSimpleName());
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
                String subId = exigirId(subIdDeEvento(data), "subscriptionId");
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
        String invoiceId = exigirId(textOrNull(data, "id"), "id");
        String subId = exigirId(subIdDeEvento(data), "subscriptionId");
        Map<?, ?> invoice = onvo.obtenerRenovacion(invoiceId);
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.renovacion(
            invoice, sub, invoiceId, subId, onvo.modoEsperado(), onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) throw rechazo(r.motivo(), subId);
        exigirCustomerLocal(subId, sub);
        suscripcionService.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
    }

    /**
     * M1: un payment-intent.succeeded es de billing solo si trae subscriptionId, esa suscripción existe
     * localmente (lock) y el GET del intent a ONVO confirma el mismo subscriptionId. No se usa customerId
     * (billing y checkout/POS comparten cuenta y llave ONVO) ni metadata.
     */
    private boolean intentAtribuibleASuscripcion(JsonNode data) {
        String subId = subIdDeEvento(data);
        String intentId = textOrNull(data, "id");
        if (subId == null || intentId == null) return false;
        if (!OnvoBillingClient.idValido(subId) || !OnvoBillingClient.idValido(intentId)) return false;
        if (suscripcionRepo.findByOnvoSubscriptionIdForUpdate(subId).isEmpty()) return false;
        // Sandbox ONVO: el payment intent NO trae subscriptionId; el vínculo es factura.paymentIntentId y
        // factura.subscriptionId (la factura más reciente de la suscripción, latestInvoiceId).
        Map<?, ?> factura = facturaMasReciente(onvo.obtenerSuscripcion(subId));
        if (!subId.equals(OnvoBillingVerificador.texto(factura, "subscriptionId"))
                || !intentId.equals(OnvoBillingVerificador.texto(factura, "paymentIntentId"))) {
            log.warn("[onvo-billing] Intent {} con subscriptionId={} que la factura de ONVO no confirma: va a checkout",
                intentId, subId);
            return false;
        }
        return true;
    }

    /** Factura referida por latestInvoiceId de la suscripción (GET); mapa vacío si no hay. */
    private Map<?, ?> facturaMasReciente(Map<?, ?> sub) {
        String facturaId = OnvoBillingVerificador.texto(sub, "latestInvoiceId");
        if (facturaId == null) return Map.of();
        return onvo.obtenerRenovacion(facturaId);
    }

    /** Alta: ya atribuida por {@link #intentAtribuibleASuscripcion}; se relee el intent por GET y se verifica. */
    private void activarAltaPorIntent(JsonNode data) {
        String intentId = exigirId(textOrNull(data, "id"), "id");
        String subId = exigirId(subIdDeEvento(data), "subscriptionId");
        Map<?, ?> intent = onvo.obtenerPaymentIntent(intentId);
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        Map<?, ?> factura = facturaMasReciente(sub);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.altaPorIntent(
            intent, factura, sub, intentId, subId, onvo.modoEsperado(), onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) throw rechazo(r.motivo(), subId);
        exigirCustomerLocal(subId, sub);
        suscripcionService.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
    }

    /**
     * S-02: la suscripción local que se va a activar tiene que ser del mismo customer que ONVO confirma por GET.
     * Si el id de ONVO no existe localmente, procesarPagoOnvoVerificado falla (nunca se busca por metadata).
     */
    private void exigirCustomerLocal(String subId, Map<?, ?> subOnvo) {
        suscripcionRepo.findByOnvoSubscriptionId(subId).ifPresent(local -> {
            String esperado = OnvoBillingVerificador.texto(subOnvo, "customerId");
            if (esperado == null) throw rechazo("customer", subId);
            String propio = local.getOnvoCustomerId();
            if (propio != null && !propio.isBlank()) {
                if (!esperado.equals(propio)) throw rechazo("customer", subId);
                return;
            }
            // Fila local heredada sin onvo_customer_id: solo se acepta si la suscripción que ONVO devuelve por GET
            // lleva en su metadata (la escribe nuestro backend al crearla; el cliente no puede escribirla) el id
            // de la misma empresa dueña de la fila local. Nunca se toma de la metadata del webhook.
            Long empresaId = local.getEmpresa() == null ? null : local.getEmpresa().getId();
            Object meta = subOnvo == null ? null : subOnvo.get("metadata");
            String enOnvo = meta instanceof Map<?, ?> m && m.get("empresa_id") != null
                ? String.valueOf(m.get("empresa_id")) : null;
            if (empresaId == null || !String.valueOf(empresaId).equals(enOnvo)) {
                throw rechazo("customer", subId);
            }
        });
    }

    private Integer precioPlan(String nombre) {
        return planRepo.findByNombre(nombre).map(Plan::getPrecioMensual).orElse(null);
    }

    private static EventoBillingRechazado rechazo(String motivo, String ref) {
        log.error("[ALERTA-PAGO] Evento billing ONVO rechazado motivo={} ref={}", motivo, ref);
        return new EventoBillingRechazado("Evento billing ONVO no verificado: " + motivo, motivo);
    }

    private static String exigir(String valor, String campo) {
        if (valor == null) throw rechazo("falta_" + campo, "?");
        return valor;
    }

    /** Los ids del webhook son entrada no confiable: forma válida antes de armar cualquier GET a ONVO. */
    private static String exigirId(String valor, String campo) {
        exigir(valor, campo);
        if (!OnvoBillingClient.idValido(valor)) throw rechazo("id", campo);
        return valor;
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
     * Período de facturación que ONVO confirma por GET (currentPeriodStart de la suscripción), para fallas
     * cuyo cuerpo no trae invoicePeriodStart. Mismo criterio de modo que el resto: sin modo coincidente no hay clave.
     */
    private String periodoDesdeOnvo(String subId) {
        exigirId(subId, "subscriptionId");
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        if (!OnvoBillingVerificador.modoCoincide(sub, onvo.modoEsperado())) throw rechazo("modo", subId);
        if (!subId.equals(OnvoBillingVerificador.texto(sub, "id"))) throw rechazo("id", subId);
        return OnvoBillingVerificador.texto(sub, "currentPeriodStart");
    }

    /**
     * S-04: ONVO no manda id de evento arriba. La clave sale del objeto:
     * éxitos = id de la renovación/intent; fallas = suscripción + período de facturación
     * (invoicePeriodStart del cuerpo o, si falta, currentPeriodStart que ONVO confirma por GET).
     */
    static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw,
                                          java.util.function.Function<String, String> periodoOnvo) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) {
            return PREFIX + eventIdRaw;
        }
        if ("subscription.renewal.failed".equals(type) || "invoice.payment_failed".equals(type)) {
            String sub = subIdDeEvento(data);
            if (sub == null) throw rechazo("falta_periodo", type);
            String periodo = textOrNull(data, "invoicePeriodStart");
            if (periodo == null && periodoOnvo != null) periodo = periodoOnvo.apply(sub);
            if (periodo == null) throw rechazo("falta_periodo", type);
            return PREFIX + type + "_" + sub + "_" + periodo;
        }
        String id = textOrNull(data, "id");
        if (id == null) throw rechazo("falta_id", type);
        return PREFIX + type + "_" + id;
    }
}
