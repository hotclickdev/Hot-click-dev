package com.hotclick.service.onvo.cuenta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Locale;

/**
 * Elige el cliente de cuentas conectadas. El mock solo existe con perfil
 * {@code (dev | test) & !prod & !production} y sin ningún perfil prod/production en cualquier
 * mayúscula/minúscula (Spring compara perfiles con mayúsculas exactas). Fuera de eso, cliente real:
 * sin llave falla cerrado y la cuenta queda PENDIENTE_ONVO.
 */
@Configuration
public class OnvoCuentaConectadaConfig {

    private static final Logger log = LoggerFactory.getLogger(OnvoCuentaConectadaConfig.class);
    static final String PERFIL_SIMULACION = "(dev | test) & !prod & !production";

    @Bean
    public OnvoCuentaConectadaClient onvoCuentaConectadaClient(Environment env, RestTemplate restTemplate,
                                                               @Value("${onvo.secret-key:}") String secretKey) {
        boolean sinLlave = secretKey == null || secretKey.isBlank();
        if (sinLlave && permiteSimulacion(env)) {
            log.warn("[onvo-cuentas] Perfil dev/test sin llave: cuentas conectadas simuladas.");
            return new OnvoCuentaConectadaMockClient();
        }
        return new OnvoCuentaConectadaHttpClient(restTemplate, secretKey);
    }

    static boolean permiteSimulacion(Environment env) {
        if (env == null || !env.acceptsProfiles(Profiles.of(PERFIL_SIMULACION))) return false;
        return Arrays.stream(env.getActiveProfiles())
            .map(p -> p == null ? "" : p.trim().toLowerCase(Locale.ROOT))
            .noneMatch(p -> p.equals("prod") || p.equals("production"));
    }
}
