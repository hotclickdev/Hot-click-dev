package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.legal.MayoriaEdad;
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
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) Map<String, String> bodyOpcional) {

        Map<String, String> body = bodyOpcional == null ? Map.of() : bodyOpcional;
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Sin token es falta de autenticación (401), no error del servidor ni del cuerpo.
            return ResponseEntity.status(401).body(ResponseDTO.error("Token de Clerk requerido"));
        }
        if (!clerkTokenService.isConfigured()) {
            return ResponseEntity.status(503)
                .body(ResponseDTO.error("Autenticación social no disponible (CLERK_JWKS_URI no configurado)"));
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

        // P1-01: la identidad sale SOLO del token verificado. email y clerkUserId del body se ignoran.
        String email = emailVerificado(clerkJwt);
        if (email == null) {
            log.warn("[clerk-sync] Rechazado: token sin email verificado. clerkUserId={} bodyEmail={}",
                clerkUserId, body.containsKey("email") ? "presente(ignorado)" : "ausente");
            return ResponseEntity.status(401).body(ResponseDTO.error(
                "El token de Clerk no trae un correo verificado. Verificá tu correo e intentá de nuevo."));
        }

        try {
            return ResponseEntity.ok(ResponseDTO.success("ok", clerkSyncService.sync(
                clerkUserId, email,
                Optional.ofNullable(body.get("nombre")).orElse(""),
                Optional.ofNullable(body.get("apellido")).orElse(""),
                Optional.ofNullable(body.get("fotoUrl")).orElse(""),
                MayoriaEdad.desdeTexto(body.get("declaraMayoriaEdad")))));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (ClerkSyncService.ClerkVinculoConflictoException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Correo del claim {@code email} (o {@code email_address}) solo si el claim {@code email_verified}
     * es verdadero. Plantilla de Clerk «hotclick-session»:
     * {@code {"email": "{{user.primary_email_address}}", "email_verified": "{{user.email_verified}}"}}.
     */
    static String emailVerificado(Jwt jwt) {
        String email = Optional.ofNullable(jwt.getClaimAsString("email"))
            .or(() -> Optional.ofNullable(jwt.getClaimAsString("email_address")))
            .orElse("").toLowerCase().trim();
        Object verificado = jwt.getClaims().get("email_verified");
        boolean ok = Boolean.TRUE.equals(verificado) || "true".equalsIgnoreCase(String.valueOf(verificado));
        return (!email.isBlank() && email.contains("@") && ok) ? email : null;
    }
}
