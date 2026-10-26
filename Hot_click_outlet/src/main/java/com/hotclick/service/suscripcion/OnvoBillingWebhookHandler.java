package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.StripeEvento;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.SuscripcionService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

/**
 * Despacha eventos ONVO de billing SaaS.
 * Idempotencia vía hot_click_stripe_evento_tb con prefijo onvo_.
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";
    /** Prefijo de error para eventos rechazados: quedan auditados y una reentrega se trata como duplicado. */
    static final String PREFIJO_RECHAZADO = "RECHAZADO: ";

    /** Resultado del webhook de billing; solo un fallo transitorio propio sale como excepción. */
    public enum Resultado { NO_BILLING, PROCESADO, DUPLICADO, RECHAZADO }

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;
    private final OnvoService onvoService;
    private final OnvoBillingDespachoTx despachoTx;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService,
                                     OnvoService onvoService,
                                     OnvoBillingDespachoTx despachoTx) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
        this.onvoService = onvoService;
        this.despachoTx = despachoTx;
    }

    /**
     * @return true si el evento era de billing SaaS (aunque ya estuviera procesado o se rechazara).
     */
    @Transactional
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        return procesar(type, data, eventIdRaw) != Resultado.NO_BILLING;
    }

    /**
     * Registra y despacha un evento de billing. Inválido, de otro modo (test/live) o rechazado por
     * el negocio: queda auditado y devuelve RECHAZADO (2xx). Duplicado: DUPLICADO (2xx). Fallo
     * transitorio propio (BD, timeout): se relanza para que el webhook responda 5xx y ONVO reintente.
     */
    @Transactional
    public Resultado procesar(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data)) {
            return Resultado.NO_BILLING;
        }
        String eventId = eventIdParaIdempotencia(type, data, eventIdRaw);
        StripeEvento previo = eventoRepo.findByIdForUpdate(eventId).orElse(null);
        if (previo != null && (Boolean.TRUE.equals(previo.getProcesadoOk())
                || (previo.getError() != null && previo.getError().startsWith(PREFIJO_RECHAZADO)))) {
            log.info("[onvo-billing] Evento ya procesado o rechazado — ignorando: {}", eventId);
            return Resultado.DUPLICADO;
        }
        if (eventoRepo.findById(eventId).isEmpty()) {
            StripeEvento ev = new StripeEvento();
            ev.setStripeEventId(eventId);
            ev.setTipo(type);
            eventoRepo.save(ev);
        }
        String modo = textOrNull(data, "mode");
        String esperado = onvoService != null ? onvoService.modoEsperado() : null;
        if (modo != null && esperado != null && !esperado.equalsIgnoreCase(modo)) {
            log.warn("[onvo-billing] Evento {} de modo {} con llave {} — rechazado", eventId, modo, esperado);
            marcar(eventId, false, PREFIJO_RECHAZADO + "modo " + modo + " distinto de " + esperado);
            return Resultado.RECHAZADO;
        }
        try {
            despachoTx.ejecutar(() -> despachar(type, data));
            marcar(eventId, true, null);
            return Resultado.PROCESADO;
        } catch (RuntimeException e) {
            if (esRechazoDeNegocio(e)) {
                log.warn("[onvo-billing] Evento {} rechazado: {}", eventId, e.getMessage());
                marcar(eventId, false, PREFIJO_RECHAZADO + e.getMessage());
                return Resultado.RECHAZADO;
            }
            marcar(eventId, false, e.getMessage());
            throw e;
        }
    }

    /** Rechazo determinista (reintentar no cambia nada). BD y demás errores se tratan como transitorios. */
    static boolean esRechazoDeNegocio(RuntimeException e) {
        if (e instanceof DataAccessException) return false;
        return e instanceof NoSuchElementException
            || e instanceof IllegalArgumentException
            || e instanceof IllegalStateException;
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
