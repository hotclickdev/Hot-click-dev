package com.hotclick.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.hotclick.service.stripe.StripePosCheckoutClient;
import com.hotclick.service.stripe.StripeSubscriptionClient;
import com.hotclick.service.stripe.StripeWebhookSupport;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired private StripeSubscriptionClient subscriptionClient;
    @Autowired private StripePosCheckoutClient  posCheckoutClient;
    @Autowired private StripeWebhookSupport     webhookSupport;

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

    public String getWebhookSecret() { return webhookSupport.getWebhookSecret(); }

    public boolean isMockMode() { return mockMode; }

    public String getPriceIdForPlan(String planNombre) {
        return subscriptionClient.getPriceIdForPlan(planNombre);
    }

    public String crearORecuperarCustomer(Long empresaId, String email, String nombre,
                                          String stripeCustomerIdExistente) throws StripeException {
        return subscriptionClient.crearORecuperarCustomer(empresaId, email, nombre, stripeCustomerIdExistente, mockMode);
    }

    public String crearCheckoutSession(String customerId, String priceId, Long empresaId,
                                       Long suscripcionId) throws StripeException {
        return subscriptionClient.crearCheckoutSession(customerId, priceId, empresaId, suscripcionId, mockMode);
    }

    public String crearPortalSession(String customerId) throws StripeException {
        return subscriptionClient.crearPortalSession(customerId, mockMode);
    }

    public void cancelarSuscripcion(String stripeSubscriptionId, boolean inmediata) throws StripeException {
        subscriptionClient.cancelarSuscripcion(stripeSubscriptionId, inmediata, mockMode);
    }

    public com.stripe.model.Event construirEvento(String payload, String sigHeader) throws StripeException {
        return webhookSupport.construirEvento(payload, sigHeader);
    }

    public String crearCheckoutPOS(Integer totalColones, List<Map<String, Object>> items,
                                   String successUrl, String cancelUrl,
                                   Long empresaId, String posQrToken) throws StripeException {
        return posCheckoutClient.crearCheckoutPOS(totalColones, items, successUrl, cancelUrl, empresaId, posQrToken, mockMode);
    }

    public boolean checkoutSessionPagada(String sessionId) throws StripeException {
        return posCheckoutClient.checkoutSessionPagada(sessionId, mockMode);
    }
}
