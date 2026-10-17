package com.hotclick.security.staging;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

@Configuration
@Profile("staging")
public class StagingAuthConfig {

    @Bean
    StagingJwtFilterHolder stagingJwtFilterHolder(Environment env) {
        if (!StagingAuthGuard.validar(env)) {
            return new StagingJwtFilterHolder(null);
        }
        return new StagingJwtFilterHolder(new StagingJwtFilter(env.getProperty(StagingAuthGuard.VAR_LLAVE_JWT)));
    }

    /** Contenedor para que el filtro no se registre solo en Tomcat (se agrega a la cadena de seguridad). */
    public record StagingJwtFilterHolder(StagingJwtFilter filter) {}
}
