package com.hotclick.controller;

import org.springframework.security.oauth2.jwt.Jwt;

/** Puente de test al método package-private {@code ClerkSyncController.emailVerificado} (datos ficticios). */
public final class ClerkSyncControllerAccess {

    private ClerkSyncControllerAccess() {}

    public static String emailVerificado(String email) {
        Jwt jwt = Jwt.withTokenValue("token-ficticio").header("alg", "none")
            .claim("email", email).claim("email_verified", true).build();
        return ClerkSyncController.emailVerificado(jwt);
    }
}
