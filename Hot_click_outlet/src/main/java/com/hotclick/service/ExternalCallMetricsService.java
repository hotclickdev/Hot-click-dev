package com.hotclick.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.Callable;

/**
 * F29 — Métricas para llamadas a servicios externos.
 *
 * Instrumenta: Stripe, Hacienda, Claude, Supabase Storage, SendGrid, BCCR.
 *
 * Contadores:
 *   external.call.success{service, operation}
 *   external.call.failure{service, operation}
 *
 * Timers:
 *   external.call.duration{service, operation}
 *
 * Uso:
 *   metricsService.timed("claude", "chat", () -> hacerLlamada());
 */
@Service
public class ExternalCallMetricsService {

    private static final Logger log = LoggerFactory.getLogger(ExternalCallMetricsService.class);

    private final MeterRegistry registry;

    public ExternalCallMetricsService(MeterRegistry registry) {
        this.registry = registry;
    }

    /**
     * Ejecuta la llamada externa midiendo duración, registrando éxito/fallo.
     * Re-lanza la excepción original para que el caller la maneje.
     */
    public <T> T timed(String service, String operation, Callable<T> call) throws Exception {
        Timer.Sample sample = Timer.start(registry);
        try {
            T result = call.call();
            counter(service, operation, "success").increment();
            return result;
        } catch (Exception e) {
            counter(service, operation, "failure").increment();
            log.warn("[metrics] {}.{} falló: {}", service, operation, e.getMessage());
            throw e;
        } finally {
            sample.stop(Timer.builder("external.call.duration")
                .tag("service",   service)
                .tag("operation", operation)
                .register(registry));
        }
    }

    /** Versión sin checked exception para lambdas simples. */
    public <T> T timedUnchecked(String service, String operation, java.util.function.Supplier<T> call) {
        Timer.Sample sample = Timer.start(registry);
        try {
            T result = call.get();
            counter(service, operation, "success").increment();
            return result;
        } catch (Exception e) {
            counter(service, operation, "failure").increment();
            log.warn("[metrics] {}.{} falló: {}", service, operation, e.getMessage());
            throw e;
        } finally {
            sample.stop(Timer.builder("external.call.duration")
                .tag("service",   service)
                .tag("operation", operation)
                .register(registry));
        }
    }

    /** Registra manualmente un éxito (para flujos async). */
    public void recordSuccess(String service, String operation) {
        counter(service, operation, "success").increment();
    }

    /** Registra manualmente un fallo (para flujos async). */
    public void recordFailure(String service, String operation) {
        counter(service, operation, "failure").increment();
    }

    private Counter counter(String service, String operation, String status) {
        return Counter.builder("external.call.total")
            .tag("service",   service)
            .tag("operation", operation)
            .tag("status",    status)
            .register(registry);
    }
}
