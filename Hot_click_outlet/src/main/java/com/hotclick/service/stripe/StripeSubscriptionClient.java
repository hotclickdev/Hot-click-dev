package com.hotclick.service.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StripeSubscriptionClient {

    private static final Logger log = LoggerFactory.getLogger(StripeSubscriptionClient.class);

    @Value("${stripe.price-id.pro:price_pro_placeholder}")
    private String priceIdPro;

    @Value("${stripe.price-id.enterprise:price_enterprise_placeholder}")
    private String priceIdEnterprise;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    public String getPriceIdForPlan(String planNombre) {
        return switch (planNombre.toUpperCase()) {
            case "PRO"        -> priceIdPro;
            case "ENTERPRISE" -> priceIdEnterprise;
            default           -> null;
        };
    }

    @CircuitBreaker(name = "stripe", fallbackMethod = "crearCustomerFallback")
    @Retry(name = "stripe")
    public String crearORecuperarCustomer(Long empresaId, String email, String nombre,
                                          String stripeCustomerIdExistente, boolean mockMode) throws StripeException {
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

    @CircuitBreaker(name = "stripe", fallbackMethod = "crearCheckoutFallback")
    @Retry(name = "stripe")
    public String crearCheckoutSession(String customerId, String priceId, Long empresaId,
                                       Long suscripcionId, boolean mockMode) throws StripeException {
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

    @CircuitBreaker(name = "stripe", fallbackMethod = "crearPortalFallback")
    @Retry(name = "stripe")
    public String crearPortalSession(String customerId, boolean mockMode) throws StripeException {
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

    public void cancelarSuscripcion(String stripeSubscriptionId, boolean inmediata, boolean mockMode) throws StripeException {
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

    private String crearCustomerFallback(Long empresaId, String email, String nombre,
                                         String existente, boolean mockMode, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN crearCustomer empresa={}: {}", empresaId, t.getMessage());
        throw new StripeException("Servicio de pagos no disponible temporalmente", null, null, 503, null) {};
    }

    private String crearCheckoutFallback(String customerId, String priceId, Long empresaId,
                                         Long suscripcionId, boolean mockMode, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN checkout empresa={}: {}", empresaId, t.getMessage());
        throw new StripeException("Servicio de pagos no disponible temporalmente", null, null, 503, null) {};
    }

    private String crearPortalFallback(String customerId, boolean mockMode, Throwable t) throws StripeException {
        log.error("[stripe-circuit] OPEN portal customer={}: {}", customerId, t.getMessage());
        throw new StripeException("Portal de pagos no disponible temporalmente", null, null, 503, null) {};
    }
}
