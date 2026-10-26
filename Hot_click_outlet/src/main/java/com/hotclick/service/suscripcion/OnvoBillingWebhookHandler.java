package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.Plan;
import com.hotclick.model.StripeEvento;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Despacha eventos ONVO de billing SaaS.
 * Idempotencia vía hot_click_stripe_evento_tb (PK = clave de dedupe, prefijo onvo_).
 *
 * S-02: el cuerpo del webhook solo dispara la verificación. Todo se relee por GET a ONVO
 * (renovación, payment intent, suscripción) y se exige mode = modo de la llave, estado pagado,
 * moneda CRC y monto = precio del plan del priceId que confirma ONVO. El plan nunca sale de metadata.
 *
 * Transacciones (Seguridad ciclo 2): registro del evento (INSERT … ON CONFLICT DO NOTHING + flush) y
 * despacho van en UNA sola transacción, así dos entregas simultáneas se serializan en la PK y la
 * segunda ve el evento ya procesado (DUPLICADO). Un rechazo permanente revierte esa transacción
 * entera y el evento se marca rechazado en una transacción aparte que no toca nada más.
 * Un fallo transitorio (BD, GET a ONVO, suscripción local que aún no existe) revierte todo y se relanza (5xx).
 */
@Service
public class OnvoBillingWebhookHandler {

    private static final Logger log = LoggerFactory.getLogger(OnvoBillingWebhookHandler.class);
    private static final String PREFIX = "onvo_";
    /** Prefijo de error para eventos rechazados: quedan auditados y una reentrega se trata como duplicado. */
    static final String PREFIJO_RECHAZADO = "RECHAZADO: ";
    /** Largo de la PK stripe_event_id. */
    static final int MAX_EVENT_ID = 100;
    /** Largo de la columna error. */
    static final int MAX_ERROR = 255;
    static final int MAX_LOG = 120;

    /** Resultado del webhook de billing; solo un fallo transitorio propio sale como excepción. */
    public enum Resultado { NO_BILLING, PROCESADO, DUPLICADO, RECHAZADO }

    /** Evento de billing que no pasó la verificación contra ONVO. */
    public static class EventoBillingRechazado extends RuntimeException {
        private final String motivo;
        public EventoBillingRechazado(String m) { this(m, null); }
        public EventoBillingRechazado(String m, String motivo) { super(m); this.motivo = motivo; }
        public String getMotivo() { return motivo; }
        /** M2: ONVO confirmó algo que no cuadra (modo, monto, price…): reintentar no lo arregla. */
        public boolean esPermanente() { return motivo != null && PERMANENTES.contains(motivo); }
    }

    /** La suscripción local todavía no existe (carrera con el alta): transitorio, ONVO reintenta. */
    public static class SuscripcionLocalPendiente extends RuntimeException {
        public SuscripcionLocalPendiente() { super("suscripcion_local_pendiente"); }
    }

    /** M2: motivos permanentes → se registran en el ledger y se responde 200. El resto (GET caído,
     *  estado aún no pagado/activo en ONVO) sigue lanzando para que el controlador responda 5xx y ONVO reintente. */
    static final java.util.Set<String> PERMANENTES = java.util.Set.of(
        "modo", "modo_ausente", "monto", "moneda", "price_desconocido", "plan_sin_precio", "customer", "id",
        "id_invalido", "pago_parcial", "falta_id", "falta_subscriptionId", "falta_periodo");

    private final StripeEventoRepository eventoRepo;
    private final SuscripcionService suscripcionService;
    private final OnvoBillingClient onvo;
    private final PlanRepository planRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final OnvoBillingDespachoTx tx;

    public OnvoBillingWebhookHandler(StripeEventoRepository eventoRepo,
                                     SuscripcionService suscripcionService,
                                     OnvoBillingClient onvo,
                                     PlanRepository planRepo,
                                     SuscripcionRepository suscripcionRepo,
                                     OnvoBillingDespachoTx tx) {
        this.eventoRepo = eventoRepo;
        this.suscripcionService = suscripcionService;
        this.onvo = onvo;
        this.planRepo = planRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.tx = tx;
    }

    /**
     * @return true si el evento era de billing SaaS (aunque ya estuviera procesado o se rechazara).
     */
    public boolean manejarSiBilling(String type, JsonNode data, String eventIdRaw) {
        return procesar(type, data, eventIdRaw) != Resultado.NO_BILLING;
    }

    /**
     * Registra y despacha un evento de billing. Inválido, de otro modo (test/live), sin modo o rechazado
     * de forma permanente: queda auditado y devuelve RECHAZADO (2xx). Duplicado: DUPLICADO (2xx). Fallo
     * transitorio propio (BD, timeout, suscripción local pendiente): se relanza → 5xx y ONVO reintenta.
     * Sin @Transactional a propósito: abre su propia transacción para poder auditar un rechazo aparte.
     */
    public Resultado procesar(String type, JsonNode data, String eventIdRaw) {
        if (!esEventoBilling(type, data)) {
            return Resultado.NO_BILLING;
        }
        String eventId;
        try {
            eventId = eventIdParaIdempotencia(type, data, eventIdRaw);
        } catch (EventoBillingRechazado e) {
            if (e.esPermanente()) {
                log.error("[onvo-billing] Evento sin clave de idempotencia descartado (200): type={} motivo={}",
                    limpio(type), e.getMotivo());
                return Resultado.RECHAZADO;
            }
            throw e;
        }
        try {
            return tx.enTx(() -> procesarEnTx(type, data, eventId));
        } catch (EventoBillingRechazado e) {
            String codigo = "rechazo:" + (e.getMotivo() == null ? "desconocido" : e.getMotivo());
            if (esRechazoDeNegocio(e)) {
                // La tx del despacho ya se revirtió; acá solo se marca el evento.
                tx.aparte(() -> registrar(eventId, type, false, PREFIJO_RECHAZADO + codigo));
                return Resultado.RECHAZADO;
            }
            tx.aparte(() -> registrar(eventId, type, false, codigo));
            throw e;
        } catch (DataIntegrityViolationException e) {
            // Otra entrega del mismo evento ganó la PK: si ya quedó resuelto es un duplicado.
            if (Boolean.TRUE.equals(tx.aparte(() -> resuelto(eventoRepo.findById(eventId).orElse(null))))) {
                return Resultado.DUPLICADO;
            }
            throw e;
        } catch (RuntimeException e) {
            log.warn("[onvo-billing] Fallo transitorio en evento {}: {}", limpio(eventId), e.getClass().getSimpleName());
            tx.aparte(() -> registrar(eventId, type, false, e.getClass().getSimpleName()));
            throw e;
        }
    }

    /** Todo en una sola transacción: atribución, chequeo de modo, INSERT+flush del evento, despacho y marca OK. */
    private Resultado procesarEnTx(String type, JsonNode data, String eventId) {
        if ("payment-intent.succeeded".equals(type) && !intentAtribuibleASuscripcion(data)) {
            // M1: no se puede atribuir con certeza a una suscripción → flujo normal de checkout/POS.
            return Resultado.NO_BILLING;
        }
        exigirModo(data);
        int nuevo = eventoRepo.insertarSiNoExiste(eventId, limpio(type, 100), LocalDateTime.now(Constants.ZONA_CR));
        if (nuevo == 0) {
            StripeEvento previo = eventoRepo.findByIdForUpdate(eventId).orElse(null);
            if (resuelto(previo)) {
                log.info("[onvo-billing] Evento ya procesado o rechazado — ignorando: {}", limpio(eventId));
                return Resultado.DUPLICADO;
            }
        }
        despachar(type, data);
        marcar(eventId, true, null);
        return Resultado.PROCESADO;
    }

    /** Fail-closed: el evento tiene que traer mode y coincidir con el de la llave; si falta cualquiera, se rechaza. */
    private void exigirModo(JsonNode data) {
        String modo = textOrNull(data, "mode");
        String esperado = onvo.modoEsperado();
        if (modo == null || esperado == null || esperado.isBlank()) {
            throw rechazo("modo_ausente", "?");
        }
        if (!esperado.equalsIgnoreCase(modo)) {
            log.warn("[onvo-billing] Evento de modo {} con llave {} — rechazado", limpio(modo, 20), limpio(esperado, 20));
            throw rechazo("modo", "?");
        }
    }

    private static boolean resuelto(StripeEvento ev) {
        return ev != null && (Boolean.TRUE.equals(ev.getProcesadoOk())
            || (ev.getError() != null && ev.getError().startsWith(PREFIJO_RECHAZADO)));
    }

    /**
     * Solo un {@link EventoBillingRechazado} con motivo permanente es rechazo de negocio. RecursoNoEncontrado,
     * IllegalState/IllegalArgument genéricos, BD, etc. son transitorios (5xx y reintento): p. ej. la
     * suscripción local todavía no existe.
     */
    static boolean esRechazoDeNegocio(RuntimeException e) {
        return e instanceof EventoBillingRechazado r && r.esPermanente();
    }

    /** Transacción aparte: crea el evento si falta y lo marca, sin tocar nada más. */
    private Void registrar(String eventId, String type, boolean ok, String error) {
        eventoRepo.insertarSiNoExiste(eventId, limpio(type, 100), LocalDateTime.now(Constants.ZONA_CR));
        StripeEvento ev = eventoRepo.findByIdForUpdate(eventId).orElse(null);
        if (ev == null || resuelto(ev)) return null;
        ev.setProcesadoOk(ok);
        ev.setFechaProcesado(LocalDateTime.now(Constants.ZONA_CR));
        ev.setError(limpio(error, MAX_ERROR));
        eventoRepo.save(ev);
        return null;
    }

    private void marcar(String eventId, boolean ok, String error) {
        eventoRepo.findById(eventId).ifPresent(ev -> {
            ev.setProcesadoOk(ok);
            ev.setFechaProcesado(LocalDateTime.now(Constants.ZONA_CR));
            ev.setError(limpio(error, MAX_ERROR));
            eventoRepo.save(ev);
        });
    }

    /** Sin CR/LF ni otros controles (log forging) y con largo acotado. */
    static String limpio(String s, int max) {
        if (s == null) return null;
        String t = s.replaceAll("[\\p{Cntrl}\\u2028\\u2029]", "_");
        return t.length() <= max ? t : t.substring(0, max);
    }

    static String limpio(String s) { return limpio(s, MAX_LOG); }

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
                        limpio(subId), limpio(String.valueOf(sub.get("status")), 40));
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
     * M1: un payment-intent.succeeded es de billing solo si trae subscriptionId, esa suscripción existe
     * localmente (lock) y el GET del intent a ONVO confirma el mismo subscriptionId. No se usa customerId
     * (billing y checkout/POS comparten cuenta y llave ONVO) ni metadata.
     */
    private boolean intentAtribuibleASuscripcion(JsonNode data) {
        String subId = subIdDeEvento(data);
        String intentId = textOrNull(data, "id");
        if (subId == null || intentId == null) return false;
        Map<?, ?> intent = onvo.obtenerPaymentIntent(intentId);
        String subConfirmada = OnvoBillingVerificador.texto(intent, "subscriptionId");
        if (!subId.equals(subConfirmada)) {
            log.warn("[onvo-billing] Intent {} con subscriptionId={} que ONVO no confirma ({}): va a checkout",
                limpio(intentId), limpio(subId), limpio(subConfirmada));
            return false;
        }
        if (suscripcionRepo.findByOnvoSubscriptionIdForUpdate(subId).isEmpty()) {
            // ONVO confirma que es de una suscripción pero la local todavía no está (carrera con el alta):
            // transitorio → 5xx y ONVO reintenta; no se manda a checkout ni se descarta.
            throw new SuscripcionLocalPendiente();
        }
        return true;
    }

    /** Alta: ya atribuida por {@link #intentAtribuibleASuscripcion}; se relee el intent por GET y se verifica. */
    private void activarAltaPorIntent(JsonNode data) {
        String intentId = exigir(textOrNull(data, "id"), "id");
        String subId = exigir(subIdDeEvento(data), "subscriptionId");
        Map<?, ?> intent = onvo.obtenerPaymentIntent(intentId);
        Map<?, ?> sub = onvo.obtenerSuscripcion(subId);
        OnvoBillingVerificador.Resultado r = OnvoBillingVerificador.altaPorIntent(
            intent, sub, intentId, subId, onvo.modoEsperado(), onvo::planParaPriceId, this::precioPlan);
        if (!r.aceptado()) throw rechazo(r.motivo(), subId);
        suscripcionService.procesarPagoOnvoVerificado(subId, r.planNombre(), r.fechaFin());
    }

    private Integer precioPlan(String nombre) {
        return planRepo.findByNombre(nombre).map(Plan::getPrecioMensual).orElse(null);
    }

    private static EventoBillingRechazado rechazo(String motivo, String ref) {
        log.error("[ALERTA-PAGO] Evento billing ONVO rechazado motivo={} ref={}", limpio(motivo, 40), limpio(ref));
        return new EventoBillingRechazado("Evento billing ONVO no verificado: " + motivo, motivo);
    }

    private static String exigir(String valor, String campo) {
        if (valor == null) throw rechazo("falta_" + campo, "?");
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
     * S-04: ONVO no manda id de evento arriba. La clave sale del objeto:
     * éxitos = id de la renovación/intent; fallas = suscripción + período (invoicePeriodStart).
     */
    static String eventIdParaIdempotencia(String type, JsonNode data, String eventIdRaw) {
        if (eventIdRaw != null && !eventIdRaw.isBlank()) {
            return conLargoValido(PREFIX + eventIdRaw);
        }
        if ("subscription.renewal.failed".equals(type) || "invoice.payment_failed".equals(type)) {
            // ONVO: una falla por suscripción y período (subscriptionId + invoicePeriodStart).
            String sub = subIdDeEvento(data);
            String periodo = textOrNull(data, "invoicePeriodStart");
            if (sub == null || periodo == null) throw rechazo("falta_periodo", type);
            return conLargoValido(PREFIX + type + "_" + sub + "_" + periodo);
        }
        String id = textOrNull(data, "id");
        if (id == null) throw rechazo("falta_id", type);
        return conLargoValido(PREFIX + type + "_" + id);
    }

    /** La clave es la PK (varchar 100) y no se trunca (truncar uniría eventos distintos): fuera de rango → rechazo. */
    private static String conLargoValido(String clave) {
        if (clave.length() > MAX_EVENT_ID || !clave.equals(limpio(clave, MAX_EVENT_ID))) {
            throw rechazo("id_invalido", clave);
        }
        return clave;
    }
}
