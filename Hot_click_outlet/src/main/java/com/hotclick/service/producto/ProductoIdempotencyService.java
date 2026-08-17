package com.hotclick.service.producto;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

@Service
public class ProductoIdempotencyService {

    private static final String CACHE_NAME = "idempotency-keys";

    private final CacheManager cacheManager;

    public ProductoIdempotencyService(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    public boolean isDuplicate(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return false;
        }
        Cache cache = cacheManager.getCache(CACHE_NAME);
        return cache != null && cache.get(idempotencyKey) != null;
    }

    public void remember(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        Cache cache = cacheManager.getCache(CACHE_NAME);
        if (cache != null) {
            cache.put(idempotencyKey, Boolean.TRUE);
        }
    }
}
