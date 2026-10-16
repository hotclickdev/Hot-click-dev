package com.hotclick.security.staging;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/**
 * Reglas de arranque del camino de autenticación de staging (HS256 con STAGING_JWT_SECRET).
 * Corre en todos los perfiles: si las variables de staging aparecen fuera del perfil
 * staging (incluido default, que es el de producción) o staging convive con prod, la app no arranca.
 */
public final class StagingAuthGuard {

    public static final String ENABLED = "STAGING_AUTH_ENABLED";
    public static final String SECRET = "STAGING_JWT_SECRET";

    private StagingAuthGuard() {}

    /** @return true si el filtro de staging debe registrarse. */
    public static boolean validar(Environment env) {
        boolean staging = env.acceptsProfiles(Profiles.of("staging"));
        boolean prod = env.acceptsProfiles(Profiles.of("prod", "production"));
        String enabled = env.getProperty(ENABLED);
        String secret = env.getProperty(SECRET);
        boolean hayEnabled = enabled != null && !enabled.isBlank();
        boolean haySecret = secret != null && !secret.isBlank();

        if (staging && prod) {
            throw new IllegalStateException("Los perfiles staging y prod no pueden estar activos juntos.");
        }
        if (!staging && (hayEnabled || haySecret)) {
            throw new IllegalStateException(ENABLED + "/" + SECRET
                + " solo se permiten con el perfil staging. Quitalos del entorno.");
        }
        if (!staging) {
            return false;
        }
        boolean activo = "true".equalsIgnoreCase(enabled == null ? "" : enabled.trim());
        if (activo && !haySecret) {
            throw new IllegalStateException(ENABLED + "=true requiere " + SECRET + ".");
        }
        if (activo && secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(SECRET + " debe tener al menos 32 bytes (HS256).");
        }
        return activo;
    }
}
