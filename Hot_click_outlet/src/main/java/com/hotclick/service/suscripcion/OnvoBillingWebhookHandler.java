package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Despacha eventos ONVO de billing SaaS.
 * Idempotencia vía hot_click_stripe_evento_tb con prefijo onvo_.
 *
 * <p>S-02: el payload del webhook no es fuente de verdad. Antes de activar se reconsulta ONVO con la
 * llave del servidor (GET /v1/payment-intents/{id} y /v1/subscriptions/{id}); empresa y plan salen
 * de la suscripción local encontrada por onvoSubId. Si la reconsulta falla se lanza excepción:
 * el evento queda procesadoOk=false y el reintento de ONVO lo vuelve a procesar.
 *
 * <p>S-04: la llave de idempotencia usa el id del evento ONVO; sin él, una llave compuesta con un
 * discriminador del cobro. Sin discriminador no se deduplica (idempotencia por estado).
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";
    static final long CENTIMOS_POR_COLON = 100L;

    /** Rechazo definitivo: el evento no corresponde a un cobro válido. Se responde 200 sin activar. */
    static final class EventoBillingRechazado extends RuntimeException {
        final String motivo;
        EventoBillingRechazado(String motivo) {
            super(motivo);
            this.motivo = motivo;
        }
    }

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;
    private final SuscripcionRepository suscripcionRepo;
    private final OnvoBillingClient onvo;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService,
                                     SuscripcionRepository suscripcionRepo,
                                     OnvoBillingClient onvo) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
        this.suscripcionRepo = suscripcionRepo;
        this.onvo = onvo;
    }

    /**
     * @return true si el evento era de billing SaaS (aunque ya estuviera procesado o se rechazara).
     */
    @Transactional(noRollbackFor = EventoBillingRechazado.class)
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data)) {
            return false;
        }
        String eventId = eventIdParaIdempotencia(type, data, eventIdRaw);
        if (eventId == null) {
            // S-04: sin discriminador no hay dedupe duro; los efectos son idempotentes por estado.
            log.info("[onvo-billing] Evento sin discriminador ({}), se procesa sin dedupe", type);
            try {
                despachar(type, data);
            } catch (EventoBillingRechazado r) {
                log.warn("[onvo-billing] Evento rechazado: {}", r.motivo);
            }
            return true;
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
        } catch (EventoBillingRechazado r) {
            // Definitivo: queda registrado sin activar; no tiene sentido que ONVO reintente.
            marcar(eventId, false, "rechazado:" + r.motivo);
            log.warn("[onvo-billing] Evento {} rechazado: {}", eventId, r.motivo);
        } catch (RuntimeException e) {
            // Transitorio (p. ej. GET a ONVO falló): pendiente, se relanza para responder 5xx y reintentar.
            marcar(eventId, false, "error:" + e.getClass().getSimpleName());
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
                 "invoice.payment_succeeded",
                 "payment-intent.succeeded" -> activarVerificado(type, data);
            case "subscription.renewal.failed",
                 "invoice.payment_failed" -> {
                String subId = subIdDeEvento(data);
                if (subId == null) throw new EventoBillingRechazado("sin_subscription_id");
                // Fuera de orden: si ONVO ya la tiene activa (se cobró después), no se degrada.
                String estado = estadoRemoto(subId);
                if ("active".equals(estado)) {
                    log.info("[onvo-billing] Fallo tardío ignorado: ONVO reporta la suscripción activa");
                    return;
                }
                suscripcionService.procesarRenovacionOnvoFallida(subId);
            }
            case "subscription.deleted",
                 "subscription.canceled" -> {
                String subId = subIdDeEvento(data);
                if (subId == null) throw new EventoBillingRechazado("sin_subscription_id");
                String estado = estadoRemoto(subId);
                if (!"canceled".equals(estado) && !"cancelled".equals(estado)) {
                    throw new EventoBillingRechazado("cancelacion_no_confirmada");
                }
                suscripcionService.procesarSuscripcionOnvoEliminada(subId);
            }
            default -> log.debug("[onvo-billing] Evento billing ignorado: {}", type);
        }
    }

    /** Estado de la suscripción según ONVO (GET). Verifica modo e id; fallo de red → excepción. */
    private String estadoRemoto(String subId) {
        Map<?, ?> remota = onvo.obtenerSuscripcion(subId);
        if (!subId.equals(str(remota, "id"))) throw new EventoBillingRechazado("sub_id_distinto");
        if (!modoCoincide(remota)) throw new EventoBillingRechazado("modo_distinto");
        String estado = str(remota, "status");
        return estado == null ? "" : estado.toLowerCase(Locale.ROOT);
    }

    private void activarVerificado(String type, JsonNode data) {
        String subId = subIdDeEvento(data);
        if (subId == null) throw new EventoBillingRechazado("sin_subscription_id");
        Suscripcion local = suscripcionRepo.findByOnvoSubscriptionIdForUpdate(subId)
            .orElseThrow(() -> new EventoBillingRechazado("suscripcion_desconocida"));
        Plan plan = local.getPlan();
        if (plan == null || local.getEmpresa() == null) throw new EventoBillingRechazado("sin_plan_local");
        Long empresaId = local.getEmpresa().getId();

        // El payload puede traer metadata, pero si contradice la BD se rechaza (no se usa para activar).
        Long metaEmpresa = parseLong(meta(data, "empresa_id"));
        Long metaPlan = parseLong(meta(data, "plan_id"));
        if ((metaEmpresa != null && !metaEmpresa.equals(empresaId))
            || (metaPlan != null && !metaPlan.equals(plan.getId()))) {
            throw new EventoBillingRechazado("metadata_no_coincide");
        }

        // 1) Suscripción en ONVO: existe, mismo modo, de esta empresa (customer) y con el price del plan.
        Map<?, ?> remota = onvo.obtenerSuscripcion(subId);
        if (!subId.equals(str(remota, "id"))) throw new EventoBillingRechazado("sub_id_distinto");
        if (!modoCoincide(remota)) throw new EventoBillingRechazado("modo_distinto");
        if (!"active".equalsIgnoreCase(String.valueOf(str(remota, "status")))) {
            // Fuera de orden: un cobro viejo que llega tras cancelar/vencer no reactiva.
            throw new EventoBillingRechazado("suscripcion_no_activa");
        }
        String customer = str(remota, "customerId");
        if (customer == null && remota.get("customer") instanceof Map<?, ?> c) customer = str(c, "id");
        if (customer == null) customer = str(remota, "customer");
        if (local.getOnvoCustomerId() == null || !local.getOnvoCustomerId().equals(customer)) {
            throw new EventoBillingRechazado("empresa_no_coincide");
        }
        String priceEsperado = onvo.getPriceIdForPlan(plan.getNombre());
        String priceRemoto = primerPriceId(remota);
        if (priceEsperado == null || !priceEsperado.equals(priceRemoto)) {
            throw new EventoBillingRechazado("plan_no_coincide");
        }

        // 2) El cobro: payment intent succeeded, mismo modo, CRC y monto = precio del plan en BD.
        String intentId = intentIdDeEvento(type, data);
        Map<?, ?> intent = onvo.obtenerPaymentIntent(intentId);
        if (!intentId.equals(str(intent, "id"))) throw new EventoBillingRechazado("intent_id_distinto");
        if (!"succeeded".equalsIgnoreCase(String.valueOf(str(intent, "status")))) {
            throw new EventoBillingRechazado("intent_no_succeeded");
        }
        if (!modoCoincide(intent)) throw new EventoBillingRechazado("modo_distinto");
        if (!"CRC".equalsIgnoreCase(String.valueOf(str(intent, "currency")))) {
            throw new EventoBillingRechazado("moneda_distinta");
        }
        BigDecimal cobrado = numero(intent.get("amount"));
        BigDecimal esperado = BigDecimal.valueOf((long) plan.getPrecioMensual() * CENTIMOS_POR_COLON);
        if (cobrado == null || plan.getPrecioMensual() <= 0 || cobrado.compareTo(esperado) != 0) {
            throw new EventoBillingRechazado("monto_distinto");
        }
        String subDelIntent = str(intent, "subscriptionId");
        if (subDelIntent != null && !subDelIntent.equals(subId)) {
            throw new EventoBillingRechazado("intent_de_otra_suscripcion");
        }

        suscripcionService.procesarPagoOnvoVerificado(empresaId, subId, finDePeriodo(remota));
    }

    /** Intent del cobro: el propio data.id en payment-intent.*, si no paymentIntentId o vía la factura. */
    private String intentIdDeEvento(String type, JsonNode data) {
        if ("payment-intent.succeeded".equals(type)) {
            String id = textOrNull(data, "id");
            if (id == null) throw new EventoBillingRechazado("sin_payment_intent");
            return id;
        }
        String id = textOrNull(data, "paymentIntentId");
        if (id != null) return id;
        String invoiceId = textOrNull(data, "invoiceId");
        if (invoiceId == null) invoiceId = textOrNull(data, "id");
        if (invoiceId == null) throw new EventoBillingRechazado("sin_payment_intent");
        Map<?, ?> invoice = onvo.obtenerRenovacion(invoiceId);
        String desdeFactura = str(invoice, "paymentIntentId");
        if (desdeFactura == null) throw new EventoBillingRechazado("factura_sin_intent");
        return desdeFactura;
    }

    private boolean modoCoincide(Map<?, ?> objeto) {
        String esperado = onvo.modoEsperado();
        String modo = str(objeto, "mode");
        return esperado != null && esperado.equalsIgnoreCase(modo);
    }

    static String primerPriceId(Map<?, ?> sub) {
        Object items = sub.get("items");
        if (items instanceof List<?> l && !l.isEmpty() && l.get(0) instanceof Map<?, ?> item) {
            String p = str(item, "priceId");
            if (p != null) return p;
            if (item.get("price") instanceof Map<?, ?> price) return str(price, "id");
        }
        return null;
    }

    private static LocalDate finDePeriodo(Map<?, ?> sub) {
        String fin = str(sub, "currentPeriodEnd");
        if (fin == null) return null;
        try {
            return OffsetDateTime.parse(fin).atZoneSameInstant(Constants.ZONA_CR).toLocalDate();
        } catch (RuntimeException e) {
            return null;
        }
    }

    static boolean esEventoBilling(String type, JsonNode data) {
        if (type == null) return false;
        if (type.startsWith("subscription.") || type.startsWith("invoice.")) {
            return true;
        }
        // Un intent es de billing solo si apunta a una suscripción (se verifica después contra BD y ONVO).
        return "payment-intent.succeeded".equals(type) && subIdDeEvento(data) != null;
    }

    /** Id de suscripción explícito. Nunca cae a data.id salvo que el objeto sea la suscripción misma. */
    static String subIdDeEvento(JsonNode data) {
        if (data == null) return null;
        String id = textOrNull(data, "subscriptionId");
        if (id != null) return id;
        id = textOrNull(data, "subscription_id");
        if (id != null) return id;
        JsonNode sub = data.path("subscription");
        if (sub.isTextual() && !sub.asText().isBlank()) return sub.asText();
        if (sub.isObject()) return textOrNull(sub, "id");
        if (data.path("object").asText("").contains("subscription")) {
            return textOrNull(data, "id");
        }
        return null;
    }

    private static String meta(JsonNode data, String key) {
        JsonNode meta = data.path("metadata");
        if (meta.isMissingNode() || meta.isNull()) return null;
        String v = meta.path(key).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        String v = n.asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static String str(Map<?, ?> m, String k) {
        Object v = m == null ? null : m.get(k);
        if (v == null) return null;
        String s = String.valueOf(v);
        return s.isBlank() ? null : s;
    }

    private static BigDecimal numero(Object v) {
        if (v == null) return null;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Long parseLong(String raw) {
        if (raw == null) return null;
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * S-04. Orden: id del evento ONVO; si falta, llave compuesta. Para fallos/éxitos de renovación:
     * type+subId+primer discriminador disponible (paymentIntentId|invoiceId|attemptCount|periodStart).
     * Para payment-intent: type+id del intent. Sin discriminador → null (no se deduplica).
     */
    static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) {
            return acotar(PREFIX + eventIdRaw);
        }
        if ("payment-intent.succeeded".equals(type)) {
            String id = textOrNull(data, "id");
            return id == null ? null : acotar(PREFIX + type + "_" + id);
        }
        String sub = subIdDeEvento(data);
        String disc = primero(data, "paymentIntentId", "invoiceId", "attemptCount",
            "invoicePeriodStart", "periodStart", "currentPeriodStart");
        if (disc == null && !data.path("object").asText("").contains("subscription")) {
            // data.id del objeto factura/renovación también identifica el cobro.
            disc = textOrNull(data, "id");
        }
        if (disc == null) return null;
        return acotar(PREFIX + type + "_" + (sub != null ? sub : "nosub") + "_" + disc);
    }

    /** La PK admite 100 caracteres: llaves más largas se reemplazan por su SHA-256 (determinista). */
    private static String acotar(String llave) {
        if (llave.length() <= 100) return llave;
        try {
            byte[] h = java.security.MessageDigest.getInstance("SHA-256")
                .digest(llave.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return PREFIX + "h_" + java.util.HexFormat.of().formatHex(h);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String primero(JsonNode data, String... campos) {
        for (String c : campos) {
            String v = textOrNull(data, c);
            if (v != null) return c + ":" + v;
        }
        return null;
    }
}
