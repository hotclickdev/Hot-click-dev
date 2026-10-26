package com.hotclick.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Una llave de prueba de ONVO (onvo_test_…) solo se acepta con perfil dev/test estricto
 * ({@link PerfilesSeguros#DEV_O_TEST_ESTRICTO}). En cualquier otro caso el arranque falla:
 * producción nunca cobra contra el sandbox ni da por pagados cobros de prueba.
 */
@Component
public class OnvoClaveGuard {

    static final String PREFIJO_PRUEBA = "onvo_test_";

    private final Environment environment;

    @Value("${onvo.secret-key:}")
    private String secretKey;

    public OnvoClaveGuard(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validarAlArrancar() {
        validar(secretKey, environment);
    }

    /** Lanza si la llave es de prueba y no hay perfil dev/test estricto. No incluye la llave en el mensaje. */
    public static void validar(String llave, Environment env) {
        if (llave != null && llave.trim().startsWith(PREFIJO_PRUEBA) && !PerfilesSeguros.esDevOTestEstricto(env)) {
            throw new IllegalStateException(
                "onvo.secret-key es una llave de prueba y el perfil activo no es dev/test estricto");
        }
    }
}
