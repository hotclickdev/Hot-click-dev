package com.hotclick.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provee un SimpleMeterRegistry cuando Actuator no está en el classpath.
 * ExternalCallMetricsService requiere MeterRegistry para instrumentar llamadas externas.
 */
@Configuration
public class MetricsConfig {

    @Bean
    MeterRegistry meterRegistry() {
        return new SimpleMeterRegistry();
    }
}
