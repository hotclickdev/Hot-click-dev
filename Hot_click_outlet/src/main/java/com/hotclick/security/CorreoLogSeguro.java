package com.hotclick.security;

/** Enmascara correos para logs: a***@dominio. Las tablas de auditoría guardan el valor completo. */
public final class CorreoLogSeguro {

    private CorreoLogSeguro() {}

    public static String enmascarar(String correo) {
        if (correo == null || correo.isBlank()) return "***";
        String c = correo.trim();
        int at = c.indexOf('@');
        if (at <= 0) return "***";
        return c.charAt(0) + "***" + c.substring(at);
    }
}
