package com.hotclick.rag.classifier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Contadores en memoria para monitorear el tráfico del asistente.
 *
 * Métricas disponibles:
 *   - total_consultas             : todas las peticiones recibidas
 *   - consultas_validas           : PRODUCTO + COMPRA + SOPORTE
 *   - consultas_fuera_de_dominio  : bloqueadas sin llegar al LLM
 *   - intentos_prompt_injection   : intentos de manipulación del sistema
 *
 * Los contadores se loguean diariamente en DEBUG para no saturar el log.
 * Se exponen vía {@link #getSummary()} para el panel de admin.
 */
@Service
public class AssistantMetricsService {

    private static final Logger log = LoggerFactory.getLogger(AssistantMetricsService.class);

    private final AtomicLong total            = new AtomicLong(0);
    private final AtomicLong validas          = new AtomicLong(0);
    private final AtomicLong fueraDeDominio   = new AtomicLong(0);
    private final AtomicLong promptInjection  = new AtomicLong(0);

    /**
     * Registra una consulta clasificada.
     * Llamar inmediatamente después de {@link QueryClassifier#classify}.
     */
    public void record(QueryClassification classification) {
        total.incrementAndGet();
        switch (classification) {
            case PRODUCTO, COMPRA, SOPORTE -> validas.incrementAndGet();
            case FUERA_DE_DOMINIO          -> fueraDeDominio.incrementAndGet();
            case PROMPT_INJECTION          -> {
                promptInjection.incrementAndGet();
                log.warn("[classifier] Intento de prompt injection detectado. Total: {}", promptInjection.get());
            }
        }
    }

    /**
     * Retorna el resumen actual de métricas.
     * Usado por el endpoint de admin y logs periódicos.
     */
    public Map<String, Long> getSummary() {
        return Map.of(
            "total_consultas",            total.get(),
            "consultas_validas",          validas.get(),
            "consultas_fuera_de_dominio", fueraDeDominio.get(),
            "intentos_prompt_injection",  promptInjection.get()
        );
    }

    /** Porcentaje de consultas válidas sobre el total (0-100). */
    public double getValidRatio() {
        long t = total.get();
        return t == 0 ? 100.0 : (validas.get() * 100.0 / t);
    }

    /** Log periódico cada 6 horas para monitoreo sin saturar. */
    @Scheduled(fixedDelay = 6 * 60 * 60 * 1000)
    public void logStats() {
        if (total.get() == 0) return;
        log.info("[assistant-metrics] total={} validas={} fuera_dominio={} injection={} ratio_valid={}%",
            total.get(), validas.get(), fueraDeDominio.get(), promptInjection.get(),
            String.format("%.1f", getValidRatio()));
    }
}
