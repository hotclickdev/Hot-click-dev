package com.hotclick.service.producto;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

/** Regresión prod 16-10: las anotaciones quedaron en esPublico y /recomendaciones daba 500 (LazyInitialization). */
class ProductoCatalogQueriesAnotacionesTest {

    @Test
    void getRecomendacionesEsTransaccionalYCacheable() throws Exception {
        Method m = ProductoCatalogQueries.class.getMethod("getRecomendaciones", Long.class, int.class);
        assertNotNull(m.getAnnotation(Transactional.class));
        assertNotNull(m.getAnnotation(Cacheable.class));
    }

    @Test
    void esPublicoNoLlevaAnotacionesDeProxy() throws Exception {
        Method m = ProductoCatalogQueries.class.getDeclaredMethod("esPublico", com.hotclick.model.Producto.class);
        assertNull(m.getAnnotation(Transactional.class));
        assertNull(m.getAnnotation(Cacheable.class));
    }
}
