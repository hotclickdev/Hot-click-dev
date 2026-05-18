package com.hotclick.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PayPalConfig {

    @Value("${paypal.client.id}")
    private String clientId;

    @Value("${paypal.client.secret}")
    private String clientSecret;

    @Value("${paypal.api.url:https://api-m.sandbox.paypal.com}")
    private String apiUrl;

    @Value("${paypal.webhook.id:}")
    private String webhookId;

    @Value("${app.url}")
    private String appUrl;

    public String getClientId()     { return clientId; }
    public String getClientSecret() { return clientSecret; }
    public String getApiUrl()       { return apiUrl; }
    public String getWebhookId()    { return webhookId; }

    public String getReturnUrl() {
        return appUrl.trim() + "/pago/exito";
    }

    public String getCancelUrl() {
        return appUrl.trim() + "/pago/cancelado";
    }
}
