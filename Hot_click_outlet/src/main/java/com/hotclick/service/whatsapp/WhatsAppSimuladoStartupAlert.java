package com.hotclick.service.whatsapp;

import com.hotclick.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
class WhatsAppSimuladoStartupAlert implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppSimuladoStartupAlert.class);

    private final WhatsAppOperacionStatus status;
    private final TelegramService telegramService;

    WhatsAppSimuladoStartupAlert(WhatsAppOperacionStatus status, TelegramService telegramService) {
        this.status = status;
        this.telegramService = telegramService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (status.credencialesConfiguradas()) return;
        log.warn("[WA] modo SIMULADO — WHATSAPP_PHONE_ID o WHATSAPP_TOKEN vacios; los clientes no reciben mensajes");
        telegramService.enviar(
            "*WhatsApp en modo SIMULADO*\n\n"
            + "Los mensajes a clientes no se envian. Configura WHATSAPP_PHONE_ID y WHATSAPP_TOKEN.");
    }
}
