package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.StripeEvento;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Despacha eventos ONVO de billing SaaS.
 * Idempotencia vía hot_click_stripe_evento_tb con prefijo onvo_.
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
    }

    /**
     * @return true si el evento era de billing SaaS (aunque ya estuviera procesado).
     */
    @Transactional
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data)) {
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
                 "invoice.payment_succeeded" -> activarDesdeData(data);
            case "payment-intent.succeeded" -> {
                if (tieneMetaBilling(data)) {
                    activarDesdeData(data);
                }
            }
            case "subscription.renewal.failed",
                 "invoice.payment_failed" -> {
                String subId = leerSubId(data);
                if (subId != null) {
                    suscripcionService.procesarRenovacionOnvoFallida(subId);
                }
            }
            case "subscription.deleted",
                 "subscription.canceled" -> {
                String subId = leerSubId(data);
                if (subId != null) {
                    suscripcionService.procesarSuscripcionOnvoEliminada(subId);
                }
            }
            default -> log.debug("[onvo-billing] Evento billing ignorado: {}", type);
        }
    }

    private void activarDesdeData(JsonNode data) {
        String subId = leerSubId(data);
        Long empresaId = parseLong(meta(data, "empresa_id"));
        Long planId = parseLong(meta(data, "plan_id"));
        if (subId == null && empresaId == null) {
            log.warn("[onvo-billing] Pago sin subscriptionId ni empresa_id — ignorado");
            return;
        }
        suscripcionService.procesarPagoOnvoExitoso(
            empresaId,
            subId != null ? subId : "onvo_unknown_" + empresaId,
            planId
        );
    }

    static boolean esEventoBilling(String type, JsonNode data) {
        if (type == null) return false;
        if (type.startsWith("subscription.") || type.startsWith("invoice.")) {
            return true;
        }
        return "payment-intent.succeeded".equals(type) && tieneMetaBilling(data);
    }

    private static boolean tieneMetaBilling(JsonNode data) {
        return meta(data, "empresa_id") != null && meta(data, "plan_id") != null;
    }

    private static String leerSubId(JsonNode data) {
        String id = textOrNull(data, "subscriptionId");
        if (id != null) return id;
        id = textOrNull(data, "subscription_id");
        if (id != null) return id;
        JsonNode sub = data.path("subscription");
        if (sub.isTextual()) return sub.asText();
        if (sub.isObject()) return textOrNull(sub, "id");
        if (data.has("id") && data.path("object").asText("").contains("subscription")) {
            return data.path("id").asText(null);
        }
        return textOrNull(data, "id");
    }

    private static String meta(JsonNode data, String key) {
        JsonNode meta = data.path("metadata");
        if (meta.isMissingNode() || meta.isNull()) return null;
        String v = meta.path(key).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static String textOrNull(JsonNode node, String field) {
        String v = node.path(field).asText(null);
        return v == null || v.isBlank() ? null : v;
    }

    private static Long parseLong(String raw) {
        if (raw == null) return null;
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) {
            return PREFIX + eventIdRaw;
        }
        String sub = leerSubId(data);
        String intent = textOrNull(data, "id");
        return PREFIX + type + "_" + (intent != null ? intent : sub);
    }
}
