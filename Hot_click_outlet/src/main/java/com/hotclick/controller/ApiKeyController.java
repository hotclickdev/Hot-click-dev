package com.hotclick.controller;

import com.hotclick.security.TenantContext;
import com.hotclick.service.ApiKeyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/api-keys")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
public class ApiKeyController {

    @Autowired private ApiKeyService apiKeyService;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(apiKeyService.listar(TenantContext.get()));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        try {
            String nombre  = body.getOrDefault("nombre", "Nueva clave").toString();
            String entorno = body.getOrDefault("entorno", "live").toString();
            Map<String, Object> result = apiKeyService.crear(TenantContext.get(), nombre, entorno);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> revocar(@PathVariable Long id) {
        try {
            apiKeyService.revocar(id, TenantContext.get());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
