package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

/**
 * Verifies Clerk session tokens using Clerk's public JWKS endpoint.
 * Configured via CLERK_JWKS_URI and CLERK_ISSUER environment variables.
 */
@Service
public class ClerkTokenService {

    private static final Logger log = LoggerFactory.getLogger(ClerkTokenService.class);

    private final JwtDecoder decoder;
    private final String issuer;

    public ClerkTokenService(
            @Value("${clerk.jwks-uri:}") String jwksUri,
            @Value("${clerk.issuer:}") String issuer) {
        this.issuer = issuer;
        if (jwksUri != null && !jwksUri.isBlank()) {
            this.decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
            log.info("[Clerk] JWKS decoder configured: {}", jwksUri);
        } else {
            this.decoder = null;
            log.warn("[Clerk] CLERK_JWKS_URI not set — social login disabled");
        }
    }

    public boolean isConfigured() {
        return decoder != null;
    }

    /**
     * Verifies a Clerk session token and returns the decoded JWT.
     * Throws JwtException if the token is invalid or expired.
     */
    public Jwt verify(String token) {
        if (decoder == null) {
            throw new IllegalStateException("Clerk no está configurado (falta CLERK_JWKS_URI)");
        }
        Jwt jwt = decoder.decode(token);
        if (issuer != null && !issuer.isBlank()) {
            String tokenIssuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
            if (!issuer.equals(tokenIssuer)) {
                throw new JwtException("Token issuer inválido: " + tokenIssuer);
            }
        }
        return jwt;
    }
}
