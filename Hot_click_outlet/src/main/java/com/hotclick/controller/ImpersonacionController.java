package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ImpersonacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Fuera de /api/admin/** a propósito: ese prefijo exige rol ADMIN en
 * SecurityAuthorizationRules, pero quien cierra una sesión de impersonación
 * está autenticado como el usuario impersonado (PROPIETARIO), no como ADMIN.
 * Solo requiere estar autenticado (cae en el matcher genérico /api/**).
 */
@RestController
@RequestMapping("/api/impersonacion")
public class ImpersonacionController {

    @Autowired private ImpersonacionService impersonacionService;

    @PostMapping("/{empresaId}/finalizar")
    public ResponseEntity<ResponseDTO> finalizar(@PathVariable Long empresaId,
                                                  @RequestHeader("Authorization") String authorization) {
        impersonacionService.finalizar(empresaId, authorization.replaceFirst("(?i)^Bearer ", ""));
        return ResponseEntity.ok(ResponseDTO.success("Impersonación finalizada", null));
    }
}
