package com.hotclick.config;

import com.hotclick.security.TenantAwareTaskDecorator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Ejecutor async con TenantAwareTaskDecorator para propagar el tenant
 * a threads @Async. Pool acotado para no agotar conexiones de Supabase.
 *
 * maxPoolSize=5: con HikariCP en 3 conexiones, 5 threads async es suficiente
 * sin arriesgar pool exhaustion. Ajustar si se agregan más pods o se sube
 * el tier de Supabase.
 *
 * CallerRunsPolicy: si la cola está llena (100 tasks pendientes), el thread
 * del request principal ejecuta la tarea — backpressure natural.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("hotclick-async-");
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Executor dedicado para streams SSE (AI copilot, executive, public chat).
     * CallerRunsPolicy aplica backpressure cuando el pool está lleno en lugar de
     * lanzar RejectedExecutionException.
     */
    @Bean(name = "sseExecutor")
    public Executor sseExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("hotclick-sse-");
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
