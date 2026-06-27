package com.hotclick.controller;

import com.hotclick.model.ConsentimientoLog;
import com.hotclick.repository.ConsentimientoLogRepository;
import com.hotclick.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/consentimiento")
public class ConsentimientoController {

    private static final Logger log = LoggerFactory.getLogger(ConsentimientoController.class);
    private static final Set<String> TIPOS_VALIDOS = Set.of("REGISTRO", "CHECKOUT", "VENDEDOR");

    private final ConsentimientoLogRepository repo;
    private final JwtUtil                    jwt;

    public ConsentimientoController(ConsentimientoLogRepository repo, JwtUtil jwt) {
        this.repo = repo;
        this.jwt  = jwt;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> registrar(
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {

        String tipo = body.getOrDefault("tipo", "").toUpperCase();
        if (!TIPOS_VALIDOS.contains(tipo)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo inválido"));
        }

        Long usuarioId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                usuarioId = jwt.extractUserId(token);
            } catch (Exception e) { log.warn("token error: {}", e.getMessage()); }
        }

        String ip        = obtenerIp(request);
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && userAgent.length() > 500) {
            userAgent = userAgent.substring(0, 500);
        }

        repo.save(new ConsentimientoLog(usuarioId, tipo, ip, userAgent));
        return ResponseEntity.ok(Map.of("registrado", true));
    }

    private String obtenerIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
