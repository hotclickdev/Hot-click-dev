package com.hotclick.service.stock;

/**
 * Enmascara el correo del operador en el historial de stock (SEC-02):
 * {@code vendedor@hotclick.test} → {@code v***@hotclick.test}.
 * Solo ADMIN recibe el correo completo; el resto ve la inicial y el dominio.
 */
public final class OperadorCorreoMascara {

    static final String OCULTO = "***";

    private OperadorCorreoMascara() {}

    public static String enmascarar(String correo) {
        if (correo == null) return null;
        String valor = correo.trim();
        if (valor.isEmpty()) return valor;
        int arroba = valor.lastIndexOf('@');
        if (arroba < 0) return OCULTO;
        String inicial = arroba > 0 ? valor.substring(0, 1) : "";
        return inicial + OCULTO + valor.substring(arroba);
    }
}
