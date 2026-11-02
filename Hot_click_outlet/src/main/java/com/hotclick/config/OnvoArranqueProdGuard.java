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
import java.util.regex.Pattern;

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

    /** ISO 4217 en minúsculas (usd, crc). Se normaliza con trim + minúsculas antes de validar: "USD" es válido. */
    private static final Pattern MONEDA = Pattern.compile("^[a-z]{3}$");

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
        verificarUrlRetorno();
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

    /**
     * QA5 MEDIO: la URL de retorno de ONVO sale de {@code app.url}, cuyo default ({@code ${APP_URL:...}} o el
     * localhost de dev) se usaría en silencio si APP_URL no está definida. En prod exige la variable APP_URL
     * explícita, https y no local. El mensaje nombra solo la variable, nunca su valor. Dev/test no cambian.
     */
    private void verificarUrlRetorno() {
        String appUrl = valor("APP_URL");
        if (urlPublicaValida(appUrl)) {
            return;
        }
        log.error("[ALERTA-PAGO] Producción sin APP_URL válida: la URL de retorno de ONVO caería a un default");
        throw new IllegalStateException("[ALERTA-PAGO] Producción requiere APP_URL definida (https, no localhost) para la"
            + " URL de retorno de ONVO. La app no arranca.");
    }

    static boolean urlPublicaValida(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            java.net.URI u = java.net.URI.create(url.trim());
            String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
            return "https".equalsIgnoreCase(u.getScheme()) && !host.isEmpty()
                && !host.equals("localhost") && !host.startsWith("127.") && !host.equals("0.0.0.0")
                && !host.equals("[::1]") && !host.endsWith(".local");
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /** Sin moneda, precios o price ids el billing ONVO no puede cobrar ni verificar: la app no arranca (fail-closed). */
    private void verificarConfigBilling() {
        List<String> faltan = new ArrayList<>();
        for (String[] v : CONFIG_TEXTO) {
            if (valor(v[1]).isEmpty()) faltan.add(v[0]);
        }
        // PLANES_MONEDA presente pero con formato inválido ("us", "dólares", "US$"): tampoco arranca.
        String moneda = valor("hotclick.planes.moneda");
        if (!moneda.isEmpty() && !monedaValida(moneda)) faltan.add("PLANES_MONEDA");
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

    /** Código de 3 letras ASCII (case-insensitive: las comparaciones aguas abajo ignoran mayúsculas y el ledger guarda minúsculas). */
    static boolean monedaValida(String v) {
        return v != null && MONEDA.matcher(v.trim().toLowerCase(Locale.ROOT)).matches();
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
