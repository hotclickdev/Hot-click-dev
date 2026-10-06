package com.hotclick.utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Pattern;

/** Latitud y longitud de un pin. Rechaza texto que no sea un número de mapa. */
public final class CoordenadaMapa {

    private static final Pattern NUMERO = Pattern.compile("^-?\\d{1,3}(\\.\\d{1,12})?$");
    private static final int ESCALA = 8;

    private CoordenadaMapa() {}

    /** null si el par no es una coordenada real. */
    public static BigDecimal[] parsear(String latitud, String longitud) {
        BigDecimal lat = leer(latitud, -90, 90);
        BigDecimal lng = leer(longitud, -180, 180);
        if (lat == null || lng == null) return null;
        return new BigDecimal[] { lat, lng };
    }

    private static BigDecimal leer(String crudo, double minimo, double maximo) {
        if (crudo == null || !NUMERO.matcher(crudo.trim()).matches()) return null;
        BigDecimal valor = new BigDecimal(crudo.trim()).setScale(ESCALA, RoundingMode.HALF_UP);
        double n = valor.doubleValue();
        if (n < minimo || n > maximo) return null;
        return valor;
    }
}
