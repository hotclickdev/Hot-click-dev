package com.hotclick.controller.observabilidad;

import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Métricas HTTP / circuit breakers del dashboard de observabilidad.
 * Extraído bit-idéntico de ObservabilityMetricsHandler — no cambia comportamiento.
 */
@Component
class ObservabilityHttpMetrics {

    @Autowired private CircuitBreakerRegistry circuitBreakerRegistry;

    Map<String, Object> circuitBreakers() {
        Map<String, Object> circuitBreakers = new LinkedHashMap<>();
        for (String cbName : List.of("stripe", "hacienda", "claude", "supabase")) {
            try {
                var cb = circuitBreakerRegistry.circuitBreaker(cbName);
                var m  = cb.getMetrics();
                Map<String, Object> cbInfo = new LinkedHashMap<>();
                cbInfo.put("estado",           cb.getState().toString());
                cbInfo.put("tasaFallo",         String.format("%.1f", m.getFailureRate()));
                cbInfo.put("llamadasExitosas",  m.getNumberOfSuccessfulCalls());
                cbInfo.put("llamadasFallidas",  m.getNumberOfFailedCalls());
                cbInfo.put("llamadasBuffered",  m.getNumberOfBufferedCalls());
                circuitBreakers.put(cbName, cbInfo);
            } catch (Exception e) {
                circuitBreakers.put(cbName, Map.of("estado", "NO_REGISTRADO"));
            }
        }
        return circuitBreakers;
    }
}
