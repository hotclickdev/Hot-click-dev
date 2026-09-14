package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.agentes.AgentesInspectResultDto;
import com.hotclick.service.agentes.AgentesCatalogService;
import com.hotclick.utils.Constants;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Dashboard de agentes de ingeniería (I1) — solo ADMIN de plataforma.
 * No lee ni escribe datos de tenant; el catálogo sale de classpath/docs.
 *
 * GET  /api/admin/agentes                snapshot (catálogo + olas + inspecciones)
 * GET  /api/admin/agentes/catalogo
 * GET  /api/admin/agentes/olas
 * GET  /api/admin/agentes/inspecciones
 * POST /api/admin/agentes/inspecciones   corre I1 si el clone está en disco
 */
@RestController
@RequestMapping("/api/admin/agentes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAgentesController {

    private final AgentesCatalogService catalogService;

    public AdminAgentesController(AgentesCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> snapshot() {
        return ResponseEntity.ok(ResponseDTO.success("Agentes de ingeniería", catalogService.snapshot()));
    }

    @GetMapping("/catalogo")
    public ResponseEntity<ResponseDTO> catalogo() {
        return ResponseEntity.ok(ResponseDTO.success("Catálogo I1", catalogService.loadCatalogo()));
    }

    @GetMapping("/olas")
    public ResponseEntity<ResponseDTO> olas() {
        return ResponseEntity.ok(ResponseDTO.success("Plan de olas", catalogService.loadOlas()));
    }

    @GetMapping("/inspecciones")
    public ResponseEntity<ResponseDTO> inspecciones() {
        return ResponseEntity.ok(ResponseDTO.success("Inspecciones I1", catalogService.loadInspecciones()));
    }

    @PostMapping("/inspecciones")
    public ResponseEntity<ResponseDTO> correrInspector() {
        Optional<AgentesInspectResultDto> result = catalogService.tryInspect();
        if (result.isEmpty()) {
            return sinRepoEnDisco();
        }
        return ResponseEntity.ok(ResponseDTO.success("Inspección I1", result.get()));
    }

    private static ResponseEntity<ResponseDTO> sinRepoEnDisco() {
        ResponseDTO body = new ResponseDTO(
                false,
                "I1 no puede escanear el repo en este entorno.",
                Map.of(
                        "liveInspectAvailable", false,
                        "hint", AgentesCatalogService.HINT_SIN_REPO),
                LocalDateTime.now(Constants.ZONA_CR).toString());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}
