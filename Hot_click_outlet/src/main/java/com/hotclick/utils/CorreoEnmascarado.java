package com.hotclick.utils;

/** Enmascara correos para logs, alertas y vistas compartidas: "juan@gmail.com" → "j***@gmail.com". */
public final class CorreoEnmascarado {

    private CorreoEnmascarado() {}

    public static String enmascarar(String correo) {
        if (correo == null || correo.isBlank()) return "";
        int at = correo.indexOf('@');
        if (at <= 0) return "***";
        return correo.charAt(0) + "***" + correo.substring(at);
    }
}
