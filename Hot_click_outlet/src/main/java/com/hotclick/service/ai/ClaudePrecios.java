package com.hotclick.service.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Precios del modelo Claude (USD por millón de tokens) — fuente única para el panel admin,
 * la observabilidad y el uso por tenant.
 *
 * <p>Defaults = Claude Haiku 4.5 (modelo {@code claude-haiku-4-5-20251001}), tarifa pública de
 * Anthropic (platform.claude.com/docs/en/about-claude/pricing, verificada 26-oct-2026):
 * input US$1.00 · output US$5.00 · cache read US$0.10 · cache write (5 min) US$1.25.
 * Se pueden cambiar sin deploy con {@code ia.precio.*} si se cambia {@code anthropic.model}.
 *
 * <p>Tarifa aparte para Claude Sonnet 4.6 ({@code claude-sonnet-4-6}, default del cliente de
 * incidentes cuando {@code anthropic.model} no está fijado), tarifa pública verificada 27-oct-2026:
 * input US$3.00 · output US$15.00 · cache read US$0.30 · cache write (5 min) US$3.75; configurable con
 * {@code ia.precio.sonnet.*}. Ver {@link #paraModelo(String)}.
 *
 * <p>Los precios se validan al construir: negativos, NaN o infinitos hacen fallar el arranque
 * (mejor no levantar que mostrar costos falsos en el panel).
 *
 * <p>Semántica de Anthropic: {@code input_tokens} NO incluye los tokens de caché; se facturan
 * por separado {@code cache_read_input_tokens} y {@code cache_creation_input_tokens}.
 */
@Component
public class ClaudePrecios {

    public static final double INPUT_POR_M_DEFECTO = 1.00;
    public static final double OUTPUT_POR_M_DEFECTO = 5.00;
    public static final double CACHE_LECTURA_POR_M_DEFECTO = 0.10;
    public static final double CACHE_ESCRITURA_POR_M_DEFECTO = 1.25;

    public static final double SONNET_INPUT_POR_M_DEFECTO = 3.00;
    public static final double SONNET_OUTPUT_POR_M_DEFECTO = 15.00;
    public static final double SONNET_CACHE_LECTURA_POR_M_DEFECTO = 0.30;
    public static final double SONNET_CACHE_ESCRITURA_POR_M_DEFECTO = 3.75;

    private static final double MILLON = 1_000_000.0;
    private static final ClaudePrecios SONNET_DEFECTO = new ClaudePrecios(SONNET_INPUT_POR_M_DEFECTO,
        SONNET_OUTPUT_POR_M_DEFECTO, SONNET_CACHE_LECTURA_POR_M_DEFECTO, SONNET_CACHE_ESCRITURA_POR_M_DEFECTO, null, false);
    private static final AtomicReference<ClaudePrecios> ACTUAL = new AtomicReference<>(
        new ClaudePrecios(INPUT_POR_M_DEFECTO, OUTPUT_POR_M_DEFECTO,
            CACHE_LECTURA_POR_M_DEFECTO, CACHE_ESCRITURA_POR_M_DEFECTO, SONNET_DEFECTO, false));

    private final double inputPorM;
    private final double outputPorM;
    private final double cacheLecturaPorM;
    private final double cacheEscrituraPorM;
    /** Tarifa de Sonnet 4.6 (null en la propia instancia de Sonnet). */
    private final ClaudePrecios sonnet;

    @Autowired
    public ClaudePrecios(
            @Value("${ia.precio.input-por-m:1.00}") double inputPorM,
            @Value("${ia.precio.output-por-m:5.00}") double outputPorM,
            @Value("${ia.precio.cache-lectura-por-m:0.10}") double cacheLecturaPorM,
            @Value("${ia.precio.cache-escritura-por-m:1.25}") double cacheEscrituraPorM,
            @Value("${ia.precio.sonnet.input-por-m:3.00}") double sonnetInputPorM,
            @Value("${ia.precio.sonnet.output-por-m:15.00}") double sonnetOutputPorM,
            @Value("${ia.precio.sonnet.cache-lectura-por-m:0.30}") double sonnetCacheLecturaPorM,
            @Value("${ia.precio.sonnet.cache-escritura-por-m:3.75}") double sonnetCacheEscrituraPorM) {
        this(inputPorM, outputPorM, cacheLecturaPorM, cacheEscrituraPorM,
            new ClaudePrecios(sonnetInputPorM, sonnetOutputPorM, sonnetCacheLecturaPorM, sonnetCacheEscrituraPorM, null, false),
            true);
    }

    private ClaudePrecios(double inputPorM, double outputPorM, double cacheLecturaPorM,
                          double cacheEscrituraPorM, ClaudePrecios sonnet, boolean publicar) {
        validar("input-por-m", inputPorM);
        validar("output-por-m", outputPorM);
        validar("cache-lectura-por-m", cacheLecturaPorM);
        validar("cache-escritura-por-m", cacheEscrituraPorM);
        this.sonnet = sonnet;
        this.inputPorM = inputPorM;
        this.outputPorM = outputPorM;
        this.cacheLecturaPorM = cacheLecturaPorM;
        this.cacheEscrituraPorM = cacheEscrituraPorM;
        if (publicar) {
            ACTUAL.set(this);
        }
    }

    /**
     * Precios vigentes (los configurados por propiedades una vez arrancado el contexto; los
     * defaults de Haiku 4.5 antes). Para código estático o sin inyección.
     */
    public static ClaudePrecios actual() {
        return ACTUAL.get();
    }

    /** Instancia con precios explícitos que NO reemplaza a los vigentes (tests). */
    public static ClaudePrecios de(double input, double output, double cacheLectura, double cacheEscritura) {
        return new ClaudePrecios(input, output, cacheLectura, cacheEscritura, SONNET_DEFECTO, false);
    }

    private static void validar(String nombre, double valor) {
        if (Double.isNaN(valor) || Double.isInfinite(valor) || valor < 0) {
            throw new IllegalArgumentException("ia.precio." + nombre + " invalido: debe ser un numero >= 0");
        }
    }

    /**
     * Tarifa que corresponde al modelo: Sonnet ({@code ia.precio.sonnet.*}) si el id contiene
     * "sonnet"; si no, la tarifa principal (Haiku 4.5 por defecto).
     */
    public ClaudePrecios paraModelo(String modelo) {
        if (sonnet != null && modelo != null && modelo.toLowerCase(java.util.Locale.ROOT).contains("sonnet")) {
            return sonnet;
        }
        return this;
    }

    /** Tarifa de Sonnet 4.6 configurada (para mostrarla en el panel). */
    public ClaudePrecios sonnet() {
        return sonnet != null ? sonnet : this;
    }

    /** Mapa listo para JSON del panel admin. */
    public java.util.Map<String, Object> comoMapa() {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("inputPorM", inputPorM);
        m.put("outputPorM", outputPorM);
        m.put("cacheLecturaPorM", cacheLecturaPorM);
        m.put("cacheEscrituraPorM", cacheEscrituraPorM);
        return m;
    }

    public double inputPorM() { return inputPorM; }
    public double outputPorM() { return outputPorM; }
    public double cacheLecturaPorM() { return cacheLecturaPorM; }
    public double cacheEscrituraPorM() { return cacheEscrituraPorM; }

    /** Costo estimado USD sin caché. */
    public double costoUsd(long tokensEntrada, long tokensSalida) {
        return costoUsd(tokensEntrada, tokensSalida, 0, 0);
    }

    /** Costo estimado USD con los cuatro contadores de uso de Claude. */
    public double costoUsd(long tokensEntrada, long tokensSalida,
                           long tokensCacheLectura, long tokensCacheEscritura) {
        return (tokensEntrada / MILLON * inputPorM)
             + (tokensSalida / MILLON * outputPorM)
             + (tokensCacheLectura / MILLON * cacheLecturaPorM)
             + (tokensCacheEscritura / MILLON * cacheEscrituraPorM);
    }
}
