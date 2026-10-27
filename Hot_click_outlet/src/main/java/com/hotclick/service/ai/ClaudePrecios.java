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
 * <p>Semántica de Anthropic: {@code input_tokens} NO incluye los tokens de caché; se facturan
 * por separado {@code cache_read_input_tokens} y {@code cache_creation_input_tokens}.
 */
@Component
public class ClaudePrecios {

    public static final double INPUT_POR_M_DEFECTO = 1.00;
    public static final double OUTPUT_POR_M_DEFECTO = 5.00;
    public static final double CACHE_LECTURA_POR_M_DEFECTO = 0.10;
    public static final double CACHE_ESCRITURA_POR_M_DEFECTO = 1.25;

    private static final double MILLON = 1_000_000.0;
    private static final AtomicReference<ClaudePrecios> ACTUAL = new AtomicReference<>(
        new ClaudePrecios(INPUT_POR_M_DEFECTO, OUTPUT_POR_M_DEFECTO,
            CACHE_LECTURA_POR_M_DEFECTO, CACHE_ESCRITURA_POR_M_DEFECTO, false));

    private final double inputPorM;
    private final double outputPorM;
    private final double cacheLecturaPorM;
    private final double cacheEscrituraPorM;

    @Autowired
    public ClaudePrecios(
            @Value("${ia.precio.input-por-m:1.00}") double inputPorM,
            @Value("${ia.precio.output-por-m:5.00}") double outputPorM,
            @Value("${ia.precio.cache-lectura-por-m:0.10}") double cacheLecturaPorM,
            @Value("${ia.precio.cache-escritura-por-m:1.25}") double cacheEscrituraPorM) {
        this(inputPorM, outputPorM, cacheLecturaPorM, cacheEscrituraPorM, true);
    }

    private ClaudePrecios(double inputPorM, double outputPorM, double cacheLecturaPorM,
                          double cacheEscrituraPorM, boolean publicar) {
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
        return new ClaudePrecios(input, output, cacheLectura, cacheEscritura, false);
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
