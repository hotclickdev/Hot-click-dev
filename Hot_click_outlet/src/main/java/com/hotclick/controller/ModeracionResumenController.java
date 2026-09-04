package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ModeracionResumenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/moderacion")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('global.approvals')")
public class ModeracionResumenController {

    private final ModeracionResumenService moderacionResumenService;

    public ModeracionResumenController(ModeracionResumenService moderacionResumenService) {
        this.moderacionResumenService = moderacionResumenService;
    }

    @GetMapping("/resumen")
    public ResponseEntity<ResponseDTO> resumen() {
        return ResponseEntity.ok(ResponseDTO.success("Resumen de moderación", moderacionResumenService.resumen()));
    }
}
