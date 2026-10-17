package com.hotclick.security;

/**
 * Iguala el tiempo de respuesta de los endpoints de alta: un duplicado (correo o cédula) corta antes
 * que un alta nueva, que guarda y manda el código. Sin piso, la diferencia de tiempo revelaría lo
 * mismo que el mensaje que ya se volvió genérico.
 */
public final class RespuestaUniforme {

    private RespuestaUniforme() {}

    /** Duerme lo que falte para que, desde {@code inicioNanos}, pasen al menos {@code minimoMs}. */
    public static void esperarMinimo(long inicioNanos, long minimoMs) {
        if (minimoMs <= 0) return;
        long transcurridoMs = (System.nanoTime() - inicioNanos) / 1_000_000L;
        long faltaMs = minimoMs - transcurridoMs;
        if (faltaMs <= 0) return;
        try {
            Thread.sleep(faltaMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
