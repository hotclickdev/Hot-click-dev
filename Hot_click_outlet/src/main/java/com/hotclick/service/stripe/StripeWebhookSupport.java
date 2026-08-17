package com.hotclick.service.stripe;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StripeWebhookSupport {

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public com.stripe.model.Event construirEvento(String payload, String sigHeader) throws StripeException {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new SignatureVerificationException(
                "STRIPE_WEBHOOK_SECRET no configurado — configura la variable en Render", sigHeader);
        }
        return com.stripe.net.Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
