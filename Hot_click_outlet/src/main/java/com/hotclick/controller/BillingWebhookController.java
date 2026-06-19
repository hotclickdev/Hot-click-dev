package com.hotclick.controller;

import com.hotclick.payment.StripePaymentProvider;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.StripeService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

/**
 * Recibe eventos de Stripe via webhook.
 * Usa tabla de idempotencia (hot_click_stripe_evento_tb) para evitar
 * doble procesamiento en caso de re-entrega.
 *
 * Ruta pública: Spring Security permite POST /api/webhooks/stripe sin JWT,
 * pero la firma del payload valida la autenticidad.
 */
@RestController
@RequestMapping("/api/webhooks")
public class BillingWebhookController {

    private static final Logger log = LoggerFactory.getLogger(BillingWebhookController.class);

    private final StripeService stripeService;
    private final SuscripcionService suscripcionService;
    private final StripePaymentProvider stripePaymentProvider;

    public BillingWebhookController(StripeService stripeService,
                                     SuscripcionService suscripcionService,
                                     StripePaymentProvider stripePaymentProvider) {
        this.stripeService          = stripeService;
        this.suscripcionService     = suscripcionService;
        this.stripePaymentProvider  = stripePaymentProvider;
    }

    @PostMapping("/stripe")
    public ResponseEntity<Map<String, String>> recibirWebhookStripe(
            @RequestBody String payload,
            HttpServletRequest request) {

        String sigHeader = request.getHeader("Stripe-Signature");

        Event event;
        try {
            event = stripeService.construirEvento(payload, sigHeader);
        } catch (SignatureVerificationException e) {
            log.warn("[stripe-webhook] Firma inválida: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "Invalid signature"));
        } catch (Exception e) {
            log.error("[stripe-webhook] Error al parsear evento: {}", e.getMessage());
            return ResponseEntity.status(400).body(Map.of("error", "Bad request"));
        }

        String eventId = event.getId();
        String eventType = event.getType();

        // Idempotencia — si ya fue procesado, retornar 200 sin hacer nada
        if (suscripcionService.marcarEventoRecibido(eventId, eventType)) {
            return ResponseEntity.ok(Map.of("status", "already_processed"));
        }

        String error = null;
        try {
            despachar(event);
            suscripcionService.marcarEventoProcesado(eventId, true, null);
            log.info("[stripe-webhook] Evento procesado: {} id={}", eventType, eventId);
        } catch (Exception e) {
            error = e.getMessage();
            suscripcionService.marcarEventoProcesado(eventId, false, error);
            log.error("[stripe-webhook] Error procesando {} id={}: {}", eventType, eventId, error, e);
            // Retornar 500 para que Stripe reintente
            return ResponseEntity.status(500).body(Map.of("error", "Processing error"));
        }

        return ResponseEntity.ok(Map.of("status", "ok", "eventType", eventType));
    }

    private void despachar(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                // Fallar explícitamente si el SDK no puede deserializar (mismatch de API version).
                // Sin esto, el ifPresent() no ejecuta nada, el webhook devuelve 200 y el pedido
                // jamás queda confirmado — causa raíz del spinner infinito con Google Pay.
                if (deserializer.getObject().isEmpty()) {
                    log.error("[stripe-webhook] No se pudo deserializar checkout.session.completed id={} " +
                              "— posible mismatch entre stripe-java y la API version del webhook", event.getId());
                    throw new IllegalStateException(
                        "Stripe SDK falló al deserializar checkout.session.completed. " +
                        "Verifica que la API version del webhook coincida con la del SDK. event.id=" + event.getId()
                    );
                }
                stripePaymentProvider.procesarCheckoutCompletado(
                    (Session) deserializer.getObject().get(), event.toJson(), "webhook");
            }
            case "payment_intent.payment_failed" -> {
                // Mismo guard que checkout.session.completed: fallar explícitamente ante
                // deserialización vacía para que Stripe reintente en lugar de perder el evento.
                if (deserializer.getObject().isEmpty()) {
                    log.error("[stripe-webhook] No se pudo deserializar payment_intent.payment_failed id={}",
                              event.getId());
                    throw new IllegalStateException(
                        "Deserialization failed for payment_intent.payment_failed event.id=" + event.getId());
                }
                PaymentIntent pi = (PaymentIntent) deserializer.getObject().get();
                String motivo = pi.getLastPaymentError() != null
                    ? pi.getLastPaymentError().getMessage() : "sin_detalle";
                log.warn("[stripe-webhook] payment_intent.payment_failed id={} motivo='{}'",
                    pi.getId(), motivo);
            }
            case "invoice.payment_succeeded" -> {
                deserializer.getObject().ifPresent(obj -> {
                    Invoice invoice = (Invoice) obj;
                    String subId = invoice.getSubscription();
                    String invoiceId = invoice.getId();
                    String paymentIntent = invoice.getPaymentIntent();
                    long monto = invoice.getAmountPaid();
                    String moneda = invoice.getCurrency();
                    String urlPdf = invoice.getInvoicePdf();

                    LocalDate periodoInicio = epochToDate(invoice.getPeriodStart());
                    LocalDate periodoFin    = epochToDate(invoice.getPeriodEnd());

                    Long empresaId = parseMetaLong(invoice.getMetadata(), "empresa_id");

                    suscripcionService.procesarFacturaPagada(
                        subId, invoiceId, paymentIntent, empresaId,
                        (int) monto, moneda, periodoInicio, periodoFin, urlPdf
                    );
                });
            }
            case "invoice.payment_failed" -> {
                deserializer.getObject().ifPresent(obj -> {
                    Invoice invoice = (Invoice) obj;
                    suscripcionService.procesarFacturaFallida(
                        invoice.getSubscription(), invoice.getId()
                    );
                });
            }
            case "customer.subscription.deleted" -> {
                deserializer.getObject().ifPresent(obj -> {
                    Subscription sub = (Subscription) obj;
                    suscripcionService.procesarSuscripcionEliminada(sub.getId());
                });
            }
            case "customer.subscription.updated" -> {
                deserializer.getObject().ifPresent(obj -> {
                    Subscription sub = (Subscription) obj;
                    log.info("[stripe-webhook] subscription.updated id={} status={}", sub.getId(), sub.getStatus());
                    // El estado principal se maneja vía invoice events; aquí solo loggear.
                });
            }
            default -> log.debug("[stripe-webhook] Evento ignorado: {}", event.getType());
        }
    }

    private static LocalDate epochToDate(Long epoch) {
        if (epoch == null) return null;
        return Instant.ofEpochSecond(epoch).atZone(ZoneOffset.UTC).toLocalDate();
    }

    private static Long parseMetaLong(Map<String, String> meta, String key) {
        if (meta == null || !meta.containsKey(key)) return null;
        try { return Long.parseLong(meta.get(key)); } catch (NumberFormatException e) { return null; }
    }
}
