package com.hotclick.config;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/**
 * Expresiones de perfil estrictas: un componente de dev/test NUNCA se activa si
 * también está activo prod o production (p. ej. SPRING_PROFILES_ACTIVE=dev,prod por error).
 */
public final class PerfilesSeguros {

    /** Solo dev o test, y nunca junto a prod/production. */
    public static final String DEV_O_TEST_ESTRICTO = "(dev | test) & !prod & !production";
    /** Solo dev, nunca junto a prod/production. */
    public static final String DEV_ESTRICTO = "dev & !prod & !production";
    /** Solo test, nunca junto a prod/production. */
    public static final String TEST_ESTRICTO = "test & !prod & !production";

    private PerfilesSeguros() {}

    public static boolean esProduccion(Environment env) {
        return env != null && env.acceptsProfiles(Profiles.of("prod | production"));
    }

    public static boolean esDevOTestEstricto(Environment env) {
        return env != null && env.acceptsProfiles(Profiles.of(DEV_O_TEST_ESTRICTO));
    }
}
