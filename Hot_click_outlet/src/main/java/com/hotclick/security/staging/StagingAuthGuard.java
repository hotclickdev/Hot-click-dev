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
    public static final String VAR_LLAVE_JWT = "STAGING_JWT_SECRET";
    public static final String FLYWAY_BASELINE = "STAGING_FLYWAY_BASELINE";

    private StagingAuthGuard() {}

    /** @return true si el filtro de staging debe registrarse. */
    public static boolean validar(Environment env) {
        boolean staging = env.acceptsProfiles(Profiles.of("staging"));
        boolean prod = env.acceptsProfiles(Profiles.of("prod", "production"));
        String enabled = env.getProperty(ENABLED);
        String secret = env.getProperty(VAR_LLAVE_JWT);
        boolean hayEnabled = enabled != null && !enabled.isBlank();
        boolean haySecret = secret != null && !secret.isBlank();

        if (staging && prod) {
            throw new IllegalStateException("Los perfiles staging y prod no pueden estar activos juntos.");
        }
        if (!staging && (hayEnabled || haySecret)) {
            throw new IllegalStateException(ENABLED + "/" + VAR_LLAVE_JWT
                + " solo se permiten con el perfil staging. Quitalos del entorno.");
        }
        String baseline = env.getProperty(FLYWAY_BASELINE);
        if (!staging && baseline != null && !baseline.isBlank()) {
            throw new IllegalStateException(FLYWAY_BASELINE
                + " solo se permite con el perfil staging. Quitalo del entorno.");
        }
        if (!staging) {
            return false;
        }
        boolean activo = "true".equalsIgnoreCase(enabled == null ? "" : enabled.trim());
        if (activo && !haySecret) {
            throw new IllegalStateException(ENABLED + "=true requiere " + VAR_LLAVE_JWT + ".");
        }
        if (activo && secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(VAR_LLAVE_JWT + " debe tener al menos 32 bytes (HS256).");
        }
        return activo;
    }
}
