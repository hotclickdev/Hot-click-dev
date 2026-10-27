package com.hotclick.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * C2: con perfil prod/production la app NO arranca sin una llave ONVO live (onvo_live_...).
 * Única excepción: llave onvo_test_ con el opt-in ya aprobado payments.onvo.permitir-llave-test=true (#271/#273).
 * Además exige la configuración de billing: PLANES_MONEDA, *_PRECIO_MENSUAL_USD y ONVO_PRICE_ID_*. Si falta o es
 * inválida alguna, el arranque falla con un mensaje que nombra SOLO la variable (nunca su valor).
 * Fuera de prod no hace nada (dev/test siguen con su simulación).
 */
@Component
public class OnvoArranqueProdGuard {

    private static final Logger log = LoggerFactory.getLogger(OnvoArranqueProdGuard.class);
    static final String PREFIJO_LIVE = "onvo_live_";
    static final String PREFIJO_TEST = "onvo_test_";

    /** Variable de entorno (para el mensaje) → propiedad de Spring de la que se lee. Solo se muestran los nombres. */
    static final String[][] CONFIG_TEXTO = {
        {"PLANES_MONEDA", "hotclick.planes.moneda"},
        {"ONVO_PRICE_ID_PYME", "onvo.price-id.pyme"},
        {"ONVO_PRICE_ID_NEGOCIO_PLUS", "onvo.price-id.negocio-plus"},
    };
    static final String[][] CONFIG_PRECIOS = {
        {"EMPRENDEDOR_PRECIO_MENSUAL_USD", "hotclick.planes.emprendedor.precio-mensual-usd"},
        {"PYME_PRECIO_MENSUAL_USD", "hotclick.planes.pyme.precio-mensual-usd"},
        {"NEGOCIO_PLUS_PRECIO_MENSUAL_USD", "hotclick.planes.negocio-plus.precio-mensual-usd"},
    };

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
        verificarLlave();
        verificarConfigBilling();
    }

    private void verificarLlave() {
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

    /** Sin moneda, precios o price ids el billing ONVO no puede cobrar ni verificar: la app no arranca (fail-closed). */
    private void verificarConfigBilling() {
        List<String> faltan = new ArrayList<>();
        for (String[] v : CONFIG_TEXTO) {
            if (valor(v[1]).isEmpty()) faltan.add(v[0]);
        }
        for (String[] v : CONFIG_PRECIOS) {
            if (!precioValido(valor(v[1]))) faltan.add(v[0]);
        }
        if (faltan.isEmpty()) {
            return;
        }
        String nombres = String.join(", ", faltan);
        log.error("[ALERTA-PAGO] Producción sin configuración de billing ONVO: faltan o son inválidas {}", nombres);
        throw new IllegalStateException("[ALERTA-PAGO] Producción requiere configurar (faltan o son inválidas): " + nombres
            + ". La app no arranca.");
    }

    private String valor(String propiedad) {
        String v = environment.getProperty(propiedad);
        return v == null ? "" : v.trim();
    }

    /** Número mayor que 0 (igual criterio que PreciosPlanesConfig: vacío, 0, negativo o mal escrito = sin precio). */
    private static boolean precioValido(String v) {
        if (v.isEmpty()) return false;
        try {
            return new BigDecimal(v).signum() > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private boolean produccion() {
        for (String p : environment.getActiveProfiles()) {
            String n = p == null ? "" : p.trim().toLowerCase(Locale.ROOT);
            if (n.equals("prod") || n.equals("production")) return true;
        }
        return false;
    }
}
