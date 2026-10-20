package com.hotclick.security.staging;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/** Se carga en todos los perfiles para que el arranque falle si el entorno es inseguro. */
@Configuration
public class StagingAuthGuardConfig {

    private final Environment env;

    public StagingAuthGuardConfig(Environment env) { this.env = env; }

    @PostConstruct
    void verificar() { StagingAuthGuard.validar(env); }
}
