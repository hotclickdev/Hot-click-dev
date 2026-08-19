package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.ClerkTokenService;
import com.hotclick.service.auth.ClerkSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class ClerkSyncController {

    private static final Logger log = LoggerFactory.getLogger(ClerkSyncController.class);

    @Autowired private ClerkTokenService clerkTokenService;
    @Autowired private ClerkSyncService clerkSyncService;

    @PostMapping("/clerk-sync")
    public ResponseEntity<ResponseDTO> clerkSync(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        if (!clerkTokenService.isConfigured()) {
            return ResponseEntity.status(503)
                .body(ResponseDTO.error("Autenticación social no disponible (CLERK_JWKS_URI no configurado)"));
        }
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Token de Clerk requerido"));
        }

        Jwt clerkJwt;
        try {
            clerkJwt = clerkTokenService.verify(authHeader.substring(7));
        } catch (Exception e) {
            log.warn("[clerk-sync] Token inválido: {}", e.getMessage());
            return ResponseEntity.status(401).body(ResponseDTO.error("Token de Clerk inválido o expirado"));
        }

        String clerkUserId = clerkJwt.getSubject();
        if (clerkUserId == null || clerkUserId.isBlank()) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Token de Clerk sin subject"));
        }

        String emailFromJwt = Optional.ofNullable(clerkJwt.getClaimAsString("email"))
            .orElse("").toLowerCase().trim();
        String emailFromBody = Optional.ofNullable(body.get("email")).orElse("").toLowerCase().trim();
        String email = emailFromJwt.isBlank() ? emailFromBody : emailFromJwt;
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Email requerido"));
        }

        try {
            return ResponseEntity.ok(ResponseDTO.success("ok", clerkSyncService.sync(
                clerkUserId, email, !emailFromJwt.isBlank(),
                Optional.ofNullable(body.get("nombre")).orElse(""),
                Optional.ofNullable(body.get("apellido")).orElse(""),
                Optional.ofNullable(body.get("fotoUrl")).orElse(""))));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        }
    }
}
