package com.hotclick.config;

import java.util.Locale;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/**
 * Guarda única del modo simulado: solo perfil Spring dev/test y nunca prod/production
 * (sin importar mayúsculas ni espacios, p. ej. "dev,PROD"). Fail-closed si no hay Environment.
 */
public final class PerfilSimulacion {

    private PerfilSimulacion() {
    }

    public static boolean permitido(Environment environment) {
        return environment != null
            && environment.acceptsProfiles(Profiles.of("(dev | test) & !prod & !production"))
            && !esProduccion(environment);
    }

    static boolean esProduccion(Environment environment) {
        String[] activos = environment.getActiveProfiles();
        if (activos == null) {
            return false;
        }
        for (String p : activos) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) {
                return true;
            }
        }
        return false;
    }
}
