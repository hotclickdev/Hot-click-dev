package com.hotclick.agente.interno;

import java.util.regex.Pattern;

/** Reglas del PIN del modo interno (sin acceso a datos). */
final class PinPolitica {

    private static final Pattern FORMATO = Pattern.compile("^\d{4,6}$");

    private PinPolitica() {}

    static boolean formatoValido(String pin) {
        return pin != null && FORMATO.matcher(pin).matches();
    }

    /** Rechaza PIN triviales: todos iguales o secuencias (1234, 4321). */
    static boolean demasiadoDebil(String pin) {
        boolean iguales = pin.chars().distinct().count() == 1;
        boolean asc = true;
        boolean desc = true;
        for (int i = 1; i < pin.length(); i++) {
            if (pin.charAt(i) != pin.charAt(i - 1) + 1) asc = false;
            if (pin.charAt(i) != pin.charAt(i - 1) - 1) desc = false;
        }
        return iguales || asc || desc;
    }
}
