package com.hotclick.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.util.Base64;

@Configuration
public class PayXpertConfig {

    @Value("${payxpert.api.url}")
    private String apiUrl;

    @Value("${payxpert.originator.id}")
    private String originatorId;

    @Value("${payxpert.originator.password}")
    private String originatorPassword;

    @Value("${payxpert.callback.url}")
    private String callbackUrl;

    @Value("${payxpert.redirect.success.url}")
    private String redirectSuccessUrl;

    @Value("${payxpert.redirect.cancel.url}")
    private String redirectCancelUrl;

    @Value("${payxpert.payment.ttl.minutes:30}")
    private int ttlMinutes;

    public String getApiUrl() { return apiUrl; }
    public String getCallbackUrl() { return callbackUrl; }
    public String getRedirectSuccessUrl() { return redirectSuccessUrl; }
    public String getRedirectCancelUrl() { return redirectCancelUrl; }
    public int getTtlMinutes() { return ttlMinutes; }

    public String getBasicAuthHeader() {
        String credentials = originatorId + ":" + originatorPassword;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes());
    }
}
