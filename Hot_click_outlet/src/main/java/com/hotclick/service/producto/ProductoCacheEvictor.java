package com.hotclick.service.producto;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

@Component
public class ProductoCacheEvictor {

    private final CacheManager cacheManager;

    public ProductoCacheEvictor(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @SuppressWarnings("null")
    public void evictDashboard(Long empresaId) {
        Cache c = cacheManager.getCache("dashboard-metricas");
        if (c == null) return;
        if (empresaId != null) {
            c.evict(empresaId.toString());
        } else {
            c.evict("global");
        }
    }

    @SuppressWarnings("null")
    public void evictProductosPublicos() {
        Cache c = cacheManager.getCache("productos-publicos");
        if (c != null) c.clear();
    }
}
