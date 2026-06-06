package com.hotclick.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import com.stripe.model.*;
import com.stripe.model.checkout.Session;
import com.stripe.param.*;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Wrapper sobre el SDK de Stripe.
 * Todas las llamadas HTTP a Stripe van a través de esta clase.
 * En modo mock (stripe.secret-key vacío) las operaciones retornan IDs ficticios
 * para no requerir cuenta Stripe en desarrollo local.
 */
@Service
public class StripeService {

    private static final Logger log = LoggerFactory.getLogger(StripeService.class);

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${stripe.price-id.pro:price_pro_placeholder}")
    private String priceIdPro;

    @Value("${stripe.price-id.enterprise:price_enterprise_placeholder}")
    private String priceIdEnterprise;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    private boolean mockMode = false;

    @PostConstruct
    public void init() {
        if (secretKey == null || secretKey.isBlank()) {
            mockMode = true;
            log.warn("[stripe] STRIPE_SECRET_KEY no configurado — modo MOCK activo. " +
                     "Suscripciones usan datos ficticios; pagos de productos lanzarán error.");
            return;
        }
        Stripe.apiKey = secretKey;
        log.info("[stripe] SDK inicializado (live={})", !secretKey.startsWith("sk_test_"));
    }

    public String getWebhookSecret() { return webhookSecret; }

    public boolean isMockMode() { return mockMode; }

    /**
     * Devuelve el Price ID de Stripe para un plan dado.
     * Nombres de plan: PRO, ENTERPRISE.
     */
    public String getPriceIdForPlan(String planNombre) {
        return switch (planNombre.toUpperCase()) {
            case "PRO"        -> priceIdPro;
            case "ENTERPRISE" -> priceIdEnterprise;
            default           -> null;
        };
    }

    /**
     * Crea o recupera un Customer en Stripe para la empresa.
     */
    @CircuitBreaker(name = "stripe", fallbackMethod = "crearCustomerFallback")
    @Retry(name = "stripe")
    public String crearORecuperarCustomer(Long empresaId, String email, String nombre,
                                          String stripeCustomerIdExistente) throws StripeException {
        if (mockMode) return "cus_mock_" + empresaId;

        if (stripeCustomerIdExistente != null && !stripeCustomerIdExistente.isBlank()) {
            return stripeCustomerIdExistente;
        }

        CustomerCreateParams params = CustomerCreateParams.builder()
            .setEmail(email)
            .setName(nombre)
            .putMetadata("empresa_id", String.valueOf(empresaId))
            .build();

        Customer customer = Customer.create(params);
        log.info("[stripe] Customer creado: {} para empresa={}", customer.getId(), empresaId);
        return customer.getId();
    }

    /**
     * Crea una sesión de Stripe Checkout para una nueva suscripción.
     * Retorna la URL a la que redirigir al usuario.
     */
    @CircuitBreaker(name = "stripe", fallbackMethod = "crearCheckoutFallback")
    @Retry(name = "stripe")
    public String crearCheckoutSession(String customerId, String priceId, Long empresaId,
                                       Long suscripcionId) throws StripeException {
        if (mockMode) {
            return appUrl + "/admin/billing/suscripcion?mock=success&empresa=" + empresaId;
        }

        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
            .setCustomer(customerId)
            .setSuccessUrl(appUrl + "/admin/billing/suscripcion?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(appUrl + "/admin/billing/planes")
            .addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPrice(priceId)
                    .setQuantity(1L)
                    .build()
            )
            .putMetadata("empresa_id", String.valueOf(empresaId))
            .putMetadata("suscripcion_id", String.valueOf(suscripcionId))
            .build();

        Session session = Session.create(params);
        return session.getUrl();
    }

    /**
     * Crea una URL del Customer Portal de Stripe (auto-gestión de pagos).
     */
    @CircuitBreaker(name = "stripe", fallbackMethod = "crearPortalFallback")
    @Retry(name = "stripe")
    public String crearPortalSession(String customerId) throws StripeException {
        if (mockMode) return appUrl + "/admin/billing/suscripcion?mock=portal";

        com.stripe.param.billingportal.SessionCreateParams params =
            com.stripe.param.billingportal.SessionCreateParams.builder()
                .setCustomer(customerId)
                .setReturnUrl(appUrl + "/admin/billing/suscripcion")
                .build();

        com.stripe.model.billingportal.Session session =
            com.stripe.model.billingportal.Session.create(params);
        return session.getUrl();
    }

    /**
     * Cancela una suscripción en Stripe (al final del período).
     */
    public void cancelarSuscripcion(String stripeSubscriptionId, boolean inmediata) throws StripeException {
        if (mockMode || stripeSubscriptionId == null || stripeSubscriptionId.startsWith("sub_mock")) {
            log.info("[stripe-mock] cancelarSuscripcion({}, inmediata={})", stripeSubscriptionId, inmediata);
            return;
        }

        Subscription sub = Subscription.retrieve(stripeSubscriptionId);
        if (inmediata) {
            sub.cancel();
        } else {
            SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .setCancelAtPeriodEnd(true)
                .build();
            sub.update(params);
        }
        log.info("[stripe] Suscripción {} cancelada (inmediata={})", stripeSubscriptionId, inmediata);
    }

    /**
     * Verifica la firma de un webhook Stripe y retorna el Event.
     * Si STRIPE_WEBHOOK_SECRET no está configurado, el webhook es rechazado.
     */
    // fallbacks — invocados por Resilience4j cuando el circuit está OPEN o se agota el retry

    private String crearCustomerFallback(Long empresaId, String email, String nombre,
                                         String existente, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN crearCustomer empresa={}: {}", empresaId, t.getMessage());
        throw new StripeException("Servicio de pagos no disponible temporalmente", null, null, 503, null) {};
    }

    private String crearCheckoutFallback(String customerId, String priceId, Long empresaId,
                                         Long suscripcionId, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN checkout empresa={}: {}", empresaId, t.getMessage());
        throw new StripeException("Servicio de pagos no disponible temporalmente", null, null, 503, null) {};
    }

    private String crearPortalFallback(String customerId, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN portal customer={}: {}", customerId, t.getMessage());
        throw new StripeException("Portal de pagos no disponible temporalmente", null, null, 503, null) {};
    }

    public com.stripe.model.Event construirEvento(String payload, String sigHeader) throws StripeException {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new com.stripe.exception.SignatureVerificationException(
                "STRIPE_WEBHOOK_SECRET no configurado — configura la variable en Render", sigHeader);
        }
        return com.stripe.net.Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
