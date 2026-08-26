package com.hotclick.sentry;

/**
 * Identidad acotada del request para tags de Sentry.
 * No guarda correo ni tokens. TenantFilter lo llena y lo limpia en finally.
 */
public final class SentryRequestContext {

    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROL = new ThreadLocal<>();

    private SentryRequestContext() {}

    public static void set(Long userId, String rol) {
        if (userId != null) {
            USER_ID.set(userId);
        }
        if (rol != null && !rol.isBlank()) {
            ROL.set(rol);
        }
    }

    public static Long userId() {
        return USER_ID.get();
    }

    public static String rol() {
        return ROL.get();
    }

    public static void clear() {
        USER_ID.remove();
        ROL.remove();
    }
}
