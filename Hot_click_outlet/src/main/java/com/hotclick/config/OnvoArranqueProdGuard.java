package com.hotclick.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * C2: con perfil prod/production la app NO arranca sin una llave ONVO live (onvo_live_...).
 * Única excepción: llave onvo_test_ con el opt-in ya aprobado payments.onvo.permitir-llave-test=true (#271/#273).
 * Fuera de prod no hace nada (dev/test siguen con su simulación).
 */
@Component
public class OnvoArranqueProdGuard {

    private static final Logger log = LoggerFactory.getLogger(OnvoArranqueProdGuard.class);
    static final String PREFIJO_LIVE = "onvo_live_";
    static final String PREFIJO_TEST = "onvo_test_";

    private final Environment environment;
    private final String secretKey;
    private final boolean permitirLlaveTest;

    public OnvoArranqueProdGuard(Environment environment,
                                 @Value("${onvo.secret-key:}") String secretKey,
                                 @Value("${payments.onvo.permitir-llave-test:false}") boolean permitirLlaveTest) {
        this.environment = environment;
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.permitirLlaveTest = permitirLlaveTest;
    }

    @PostConstruct
    public void verificar() {
        if (!produccion()) {
            return;
        }
        if (secretKey.startsWith(PREFIJO_LIVE)) {
            return;
        }
        if (secretKey.startsWith(PREFIJO_TEST) && permitirLlaveTest) {
            log.warn("[ALERTA-PAGO] Producción arranca con llave ONVO de prueba por opt-in (payments.onvo.permitir-llave-test).");
            return;
        }
        throw new IllegalStateException("[ALERTA-PAGO] Producción requiere ONVO_SECRET_KEY con prefijo " + PREFIJO_LIVE
            + " (o llave de prueba con PAYMENTS_ONVO_PERMITIR_LLAVE_TEST=true). La app no arranca.");
    }

    private boolean produccion() {
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) return true;
        }
        return false;
    }
}
