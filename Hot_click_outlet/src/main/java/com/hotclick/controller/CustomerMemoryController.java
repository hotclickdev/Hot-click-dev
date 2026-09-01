package com.hotclick.controller;

import com.hotclick.dto.GustosAffinityDto;
import com.hotclick.service.customermemory.CustomerMemoryAffinityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Memoria de cliente → scores de afinidad para Descubrí / catálogo "Según tus gustos".
 * Solo lectura; la memoria se actualiza vía chat asistente.
 */
@RestController
@RequestMapping("/api/customer-memory")
public class CustomerMemoryController {

    private final CustomerMemoryAffinityService affinityService;

    public CustomerMemoryController(CustomerMemoryAffinityService affinityService) {
        this.affinityService = affinityService;
    }

    /**
     * GET /api/customer-memory/affinity?visitorId={uuid}
     * Requiere JWT — el frontend lo llama solo con sesión activa.
     */
    @GetMapping("/affinity")
    public ResponseEntity<GustosAffinityDto> affinity(@RequestParam String visitorId) {
        if (!isValidVisitorId(visitorId)) {
            return ResponseEntity.badRequest().body(GustosAffinityDto.empty());
        }
        return ResponseEntity.ok(affinityService.buildAffinity(visitorId));
    }

    private static boolean isValidVisitorId(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) return false;
        try {
            UUID.fromString(visitorId);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
