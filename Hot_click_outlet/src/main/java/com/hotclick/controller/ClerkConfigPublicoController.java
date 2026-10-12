package com.hotclick.controller;

import com.hotclick.service.ClerkTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Configuración pública del login social (Clerk) que el SPA lee en runtime.
 * El {@code static/} versionado se compila sin {@code VITE_*}, así que la clave publicable de Clerk
 * no puede venir del build: sin ella el botón «Continuar con Google» no se dibuja.
 * La clave publicable es pública por diseño (va en el navegador); no es un secreto.
 */
@RestController
@RequestMapping("/api/public")
public class ClerkConfigPublicoController {

    private final ClerkTokenService clerkTokenService;
    private final String publishableKey;
    private final String issuer;

    public ClerkConfigPublicoController(
            ClerkTokenService clerkTokenService,
            @Value("${clerk.publishable-key:}") String publishableKey,
            @Value("${clerk.issuer:}") String issuer) {
        this.clerkTokenService = clerkTokenService;
        this.publishableKey = publishableKey;
        this.issuer = issuer;
    }

    @GetMapping("/auth-config")
    public ResponseEntity<Map<String, Object>> authConfig() {
        Map<String, Object> out = new HashMap<>();
        out.put("clerkPublishableKey", clerkTokenService.isConfigured() ? clave() : null);
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic()).body(out);
    }

    private String clave() {
        if (publishableKey != null && !publishableKey.isBlank()) return publishableKey.trim();
        return derivarDeIssuer(issuer);
    }

    /**
     * Clerk arma la clave publicable como {@code pk_(live|test)_ + base64(frontendApiHost + "$")}.
     * Instancias de desarrollo viven en {@code *.clerk.accounts.dev} (pk_test); el resto es producción.
     */
    static String derivarDeIssuer(String issuer) {
        if (issuer == null || issuer.isBlank()) return null;
        String host;
        try {
            host = URI.create(issuer.trim()).getHost();
        } catch (IllegalArgumentException e) {
            return null;
        }
        if (host == null || host.isBlank()) return null;
        String prefijo = host.endsWith(".clerk.accounts.dev") ? "pk_test_" : "pk_live_";
        return prefijo + Base64.getEncoder().encodeToString((host + "$").getBytes(StandardCharsets.UTF_8));
    }
}
