package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ImpersonacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Fuera de /api/admin/** a propósito: ese prefijo exige rol ADMIN en
 * SecurityAuthorizationRules, pero el token de soporte lleva rol EMPRENDEDOR
 * (vista de negocio). Solo requiere autenticación (matcher genérico /api/**).
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

    /** Pide modo escritura con motivo; devuelve un token nuevo y revoca el de lectura. */
    @PostMapping("/{empresaId}/escritura")
    public ResponseEntity<ResponseDTO> habilitarEscritura(@PathVariable Long empresaId,
                                                          @RequestHeader("Authorization") String authorization,
                                                          @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        try {
            Map<String, Object> data = impersonacionService.habilitarEscritura(
                empresaId, authorization.replaceFirst("(?i)^Bearer ", ""), motivo);
            return ResponseEntity.ok(ResponseDTO.success("Modo escritura habilitado", data));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
