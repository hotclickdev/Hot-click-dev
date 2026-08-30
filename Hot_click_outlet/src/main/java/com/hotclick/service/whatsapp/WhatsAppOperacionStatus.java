package com.hotclick.service.whatsapp;

import org.springframework.stereotype.Component;

/** Expone si WhatsApp está en PRODUCCION o SIMULADO. No revela secretos. */
@Component
public class WhatsAppOperacionStatus {

    private final WhatsAppMetaApiClient metaApiClient;

    public WhatsAppOperacionStatus(WhatsAppMetaApiClient metaApiClient) {
        this.metaApiClient = metaApiClient;
    }

    public boolean credencialesConfiguradas() {
        return metaApiClient.credencialesConfiguradas();
    }

    public String modo() {
        return credencialesConfiguradas() ? "PRODUCCION" : "SIMULADO";
    }
}
