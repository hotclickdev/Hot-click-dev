package com.hotclick.security;

/**
 * Almacena el empresaId del tenant activo en el thread actual.
 *
 * Uso:
 *   TenantContext.get()   → Long empresaId (null si ADMIN_IT o sin auth)
 *   TenantContext.set(id) → lo llama TenantFilter en cada request
 *   TenantContext.clear() → lo llama TenantFilter en afterCompletion
 *
 * IMPORTANTE — constraints de PgBouncer transaction mode:
 *   No usar SET session variables ni advisory locks en PostgreSQL.
 *   Este ThreadLocal es la única forma segura de transportar el tenant
 *   en el request thread. Para threads @Async usar TenantAwareTaskDecorator.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> EMPRESA_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static Long get() {
        return EMPRESA_ID.get();
    }

    public static void set(Long empresaId) {
        EMPRESA_ID.set(empresaId);
    }

    public static void clear() {
        EMPRESA_ID.remove();
    }
}
