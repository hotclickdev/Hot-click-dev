package com.hotclick.service.consola;

import java.time.LocalDateTime;

/** Niveles de pausa. La segunda falta leve sube a mediana y la tercera a definitiva. */
public final class SancionReglas {

    public static final String LEVE = "LEVE";
    public static final String MEDIANA = "MEDIANA";
    public static final String DEFINITIVA = "DEFINITIVA";

    private SancionReglas() {}

    public static void exigirMotivo(String motivo) {
        if (motivo == null || motivo.trim().length() < 3) {
            throw new IllegalArgumentException("El motivo es obligatorio.");
        }
    }

    public static String nivelAplicado(String solicitado, long levesPrevias) {
        String nivel = solicitado == null ? "" : solicitado.trim().toUpperCase();
        if (!LEVE.equals(nivel) && !MEDIANA.equals(nivel) && !DEFINITIVA.equals(nivel)) {
            throw new IllegalArgumentException("Nivel de sanción inválido.");
        }
        if (!LEVE.equals(nivel)) return nivel;
        if (levesPrevias >= 2) return DEFINITIVA;
        if (levesPrevias >= 1) return MEDIANA;
        return LEVE;
    }

    public static LocalDateTime fin(String nivel, LocalDateTime inicio) {
        if (DEFINITIVA.equals(nivel)) return null;
        if (MEDIANA.equals(nivel)) return inicio.plusDays(30);
        return inicio.plusDays(7);
    }
}
