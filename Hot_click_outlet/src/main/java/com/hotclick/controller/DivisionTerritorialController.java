package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.territorio.DivisionTerritorialService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/division-territorial")
public class DivisionTerritorialController {

    private static final Logger log = LoggerFactory.getLogger(DivisionTerritorialController.class);
    private final DivisionTerritorialService divisionTerritorialService;

    public DivisionTerritorialController(DivisionTerritorialService divisionTerritorialService) {
        this.divisionTerritorialService = divisionTerritorialService;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> catalogo() {
        try {
            return ResponseEntity.ok(ResponseDTO.success(
                    "División territorial", divisionTerritorialService.catalogo()));
        } catch (RuntimeException e) {
            log.warn("No se pudo consultar el IGN: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ResponseDTO.error("No se pudo cargar la división territorial del IGN."));
        }
    }
}
