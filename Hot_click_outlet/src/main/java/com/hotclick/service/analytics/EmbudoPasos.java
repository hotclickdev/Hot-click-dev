package com.hotclick.service.analytics;

import java.util.Set;
import java.util.regex.Pattern;

/** Pasos y motivos del embudo de la tienda pública. El orden no se retrocede. */
public final class EmbudoPasos {

    public static final String VISITA = "VISITA";
    public static final String PRODUCTO = "PRODUCTO";
    public static final String CARRITO = "CARRITO";
    public static final String CHECKOUT = "CHECKOUT";
    public static final String PAGO_INTENTO = "PAGO_INTENTO";

    public static final String BUSQUEDA_VACIA = "BUSQUEDA_VACIA";
    public static final String ERROR_DATOS = "ERROR_DATOS";
    public static final String ERROR_ENTREGA = "ERROR_ENTREGA";
    public static final String SIN_COMPROBANTE = "SIN_COMPROBANTE";
    public static final String PAGO_FALLIDO = "PAGO_FALLIDO";
    public static final String PAGO_CANCELADO = "PAGO_CANCELADO";

    private static final String[] ORDEN = { VISITA, PRODUCTO, CARRITO, CHECKOUT, PAGO_INTENTO };
    private static final Set<String> MOTIVOS = Set.of(
        BUSQUEDA_VACIA, ERROR_DATOS, ERROR_ENTREGA, SIN_COMPROBANTE, PAGO_FALLIDO, PAGO_CANCELADO);
    private static final Pattern UUID = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private EmbudoPasos() {}

    public static int orden(String paso) {
        if (paso == null) return -1;
        for (int i = 0; i < ORDEN.length; i++) {
            if (ORDEN[i].equals(paso)) return i;
        }
        return -1;
    }

    public static boolean motivoValido(String motivo) {
        return MOTIVOS.contains(motivo);
    }

    /** UUID del navegador. Rechaza correos y cualquier otra cadena. */
    public static boolean claveValida(String sessionKey) {
        return sessionKey != null && !sessionKey.contains("@") && UUID.matcher(sessionKey).matches();
    }
}
