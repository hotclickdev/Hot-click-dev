package com.hotclick.service.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Aviso de arranque solo en log. No notifica por Telegram: el modo simulado es el estado esperado sin credenciales. */
@Component
class WhatsAppSimuladoStartupAlert implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppSimuladoStartupAlert.class);

    private final WhatsAppOperacionStatus status;

    WhatsAppSimuladoStartupAlert(WhatsAppOperacionStatus status) {
        this.status = status;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (status.credencialesConfiguradas()) return;
        log.warn("[WA] modo SIMULADO — WHATSAPP_PHONE_ID o WHATSAPP_TOKEN vacios; los clientes no reciben mensajes");
    }
}
