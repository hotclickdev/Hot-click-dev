package com.hotclick.controller;
import com.hotclick.service.whatsapp.WhatsAppOperacionStatus;
import com.hotclick.utils.Constants;

import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;


@RestController
@RequestMapping("/api")
public class HealthController {

    private final WhatsAppOperacionStatus whatsAppOperacionStatus;

    public HealthController(WhatsAppOperacionStatus whatsAppOperacionStatus) {
        this.whatsAppOperacionStatus = whatsAppOperacionStatus;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now(Constants.ZONA_CR).toString());
        response.put("service", "HOT_CLICK Outlet");
        response.put("version", "1.1");
        response.put("whatsappModo", whatsAppOperacionStatus.modo());
        return response;
    }
}
