package com.hotclick.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.cache.annotation.EnableCaching;

import java.util.concurrent.TimeUnit;

/**
 * Caches con TTL diferenciado por nombre.
 *
 * tenantInfo       → 30s : plan, límites, features — TTL corto para reflejar pagos rápido
 * empresaFlags     → 60s : feature flags por empresa
 * dashboard-metricas → 120s: KPIs por tenant, evicción programática en escrituras
 * categorias-publicas → 300s: árbol de categorías (write-rarely)
 * marcas-publicas  → 300s: marcas activas (write-rarely)
 * default          → 120s: resto de @Cacheable
 *
 * maximumSize: 2000 para caches per-tenant (1K tenants activos + buffer).
 * recordStats(): requerido para exponer hit rates en ObservabilityController.
 *
 * Consistencia en multi-pod: eventual vía TTL.
 * Al togglear un flag el pod local evicta inmediatamente; otros pods en máx TTL.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        manager.registerCustomCache("tenantInfo",
            Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(30, TimeUnit.SECONDS)
                .recordStats()
                .build());

        manager.registerCustomCache("empresaFlags",
            Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .recordStats()
                .build());

        manager.registerCustomCache("dashboard-metricas",
            Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(120, TimeUnit.SECONDS)
                .recordStats()
                .build());

        manager.registerCustomCache("categorias-publicas",
            Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(300, TimeUnit.SECONDS)
                .recordStats()
                .build());

        manager.registerCustomCache("marcas-publicas",
            Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(300, TimeUnit.SECONDS)
                .recordStats()
                .build());

        // Default para todos los demás @Cacheable
        manager.setCaffeine(
            Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(120, TimeUnit.SECONDS)
                .recordStats()
        );

        return manager;
    }
}
