package com.hotclick.security;

/**
 * Llaves del limitador para el bloqueo por fallos de credencial (ver {@code UsuarioService.registrarFalloAutenticacion}).
 * Viven aquí para que quien desbloquea una cuenta (reset de contraseña, admin) limpie exactamente los mismos buckets.
 */
public final class ClavesFallos {

    private ClavesFallos() {}

    /** Prefijo común de todos los buckets por IP de un usuario. */
    public static String prefijoIp(Long id) {
        return "auth:fallos:usuario:" + id + ":ip:";
    }

    public static String claveIp(Long id, String ip) {
        return prefijoIp(id) + (ip == null || ip.isBlank() ? "desconocida" : ip);
    }

    public static String claveGlobal(Long id) {
        return "auth:fallos:usuario:" + id + ":global";
    }

    /**
     * Desbloqueo de cuenta: borra el bucket global y TODOS los de IP del usuario, para que el primer error después
     * de desbloquear no vuelva a bloquear (el contador seguía en el tope aunque {@code bloqueadoHasta} ya fuera null).
     */
    public static void liberarTodo(RateLimiter rateLimiter, Long id) {
        if (id == null) return;
        rateLimiter.liberar(claveGlobal(id));
        rateLimiter.liberarPrefijo(prefijoIp(id));
    }
}
