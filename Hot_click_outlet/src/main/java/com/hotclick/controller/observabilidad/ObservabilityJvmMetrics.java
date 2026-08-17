package com.hotclick.controller.observabilidad;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Métricas JVM / infra (BD, caches, pool Hikari) del dashboard de observabilidad.
 * Extraído bit-idéntico de ObservabilityMetricsHandler — no cambia comportamiento.
 */
@Component
class ObservabilityJvmMetrics {

    private static final Logger log = LoggerFactory.getLogger(ObservabilityJvmMetrics.class);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private CacheManager cacheManager;
    @Autowired private DataSource   dataSource;

    void agregarBaseDeDatos(Map<String, Object> metrics) {
        try {
            String bdSize = jdbc.queryForObject(
                "SELECT pg_size_pretty(pg_database_size(current_database()))", String.class);
            Long rawBytes = jdbc.queryForObject(
                "SELECT pg_database_size(current_database())", Long.class);
            long bdSizeBytes = rawBytes != null ? rawBytes : 0L;
            Map<String, Object> bd = new LinkedHashMap<>();
            bd.put("tamano",      bdSize);
            bd.put("tamanoBytes", bdSizeBytes);
            metrics.put("baseDeDatos", bd);
        } catch (Exception e) {
            log.warn("[observabilidad] No se pudo obtener tamaño de BD: {}", e.getMessage());
            metrics.put("baseDeDatos", Map.of("tamano", "N/D"));
        }
    }

    void agregarCaches(Map<String, Object> metrics) {
        if (cacheManager instanceof CaffeineCacheManager) {
            Map<String, Object> caches = new LinkedHashMap<>();
            for (String name : List.of("tenantInfo", "empresaFlags", "dashboard-metricas",
                                       "categorias-publicas", "marcas-publicas")) {
                var springCache = cacheManager.getCache(name);
                if (springCache instanceof CaffeineCache cc) {
                    var stats = cc.getNativeCache().stats();
                    caches.put(name, Map.of(
                        "hitRate",   String.format("%.1f%%", stats.hitRate() * 100),
                        "size",      cc.getNativeCache().estimatedSize(),
                        "evictions", stats.evictionCount()
                    ));
                }
            }
            metrics.put("caches", caches);
        }
    }

    void agregarHikari(Map<String, Object> metrics) {
        if (dataSource instanceof HikariDataSource hds) {
            try {
                var pool = hds.getHikariPoolMXBean();
                Map<String, Object> hikari = new LinkedHashMap<>();
                hikari.put("activas",   pool.getActiveConnections());
                hikari.put("idle",      pool.getIdleConnections());
                hikari.put("total",     pool.getTotalConnections());
                hikari.put("esperando", pool.getThreadsAwaitingConnection());
                hikari.put("alerta",    pool.getThreadsAwaitingConnection() > 0 ? "POOL_SATURADO" : "OK");
                metrics.put("hikari", hikari);
            } catch (Exception e) {
                log.warn("[observabilidad] HikariCP MXBean no disponible: {}", e.getMessage());
            }
        }
    }
}
