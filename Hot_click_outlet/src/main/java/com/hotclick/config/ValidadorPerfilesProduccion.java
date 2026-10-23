package com.hotclick.config;

import java.util.Locale;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Falla el arranque si un perfil activo (o default) equivale a prod/production
 * ignorando mayúsculas/espacios pero no está escrito exactamente así
 * (p. ej. "PROD", "Prod", " prod"). Spring compara perfiles de forma sensible a
 * mayúsculas, así que esas variantes evadirían las guardas de {@link PerfilesSeguros}.
 * Corre como EnvironmentPostProcessor, después de cargar config data y antes de crear beans.
 */
public class ValidadorPerfilesProduccion implements EnvironmentPostProcessor, Ordered {

    static final String MENSAJE =
            "Perfil de produccion con escritura no canonica; use exactamente 'prod' o 'production'";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        validar(environment.getActiveProfiles());
        validar(environment.getDefaultProfiles());
    }

    public static void validar(String[] perfiles) {
        if (perfiles == null) {
            return;
        }
        for (String p : perfiles) {
            if (p == null) {
                continue;
            }
            String norm = p.trim().toLowerCase(Locale.ROOT);
            if ((norm.equals("prod") || norm.equals("production"))
                    && !(p.equals("prod") || p.equals("production"))) {
                throw new IllegalStateException(MENSAJE);
            }
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
