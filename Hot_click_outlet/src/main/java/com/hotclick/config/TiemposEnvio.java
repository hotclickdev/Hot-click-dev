package com.hotclick.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

/**
 * Tiempos de entrega leídos de {@code classpath:config/tiempos-envio.json}, la ÚNICA FUENTE
 * que comparte con el frontend ({@code frontend/src/config/tiemposEnvio.ts}). Decisión D13;
 * valores confirmados por el negocio el 2-oct-2026.
 */
public final class TiemposEnvio {

    static final String RECURSO = "config/tiempos-envio.json";

    /** Rangos: minutos y horas para el rápido; días hábiles para los normales. */
    public record Valores(int rapidoDesdeMin, int rapidoHastaHoras,
                          int normalGamDesde, int normalGamHasta,
                          int fueraGamDesde, int fueraGamHasta) {}

    private static final Valores VALORES = cargar();

    private TiemposEnvio() {}

    public static Valores valores() {
        return VALORES;
    }

    /**
     * Plazo en español para un método de envío: «de 2 a 4 días hábiles», «de 30 min a 2 horas».
     * Un método sin GAM conocido (p. ej. envío genérico) usa el rango que cubre los dos normales.
     */
    public static String plazo(String metodoEnvio) {
        Valores v = VALORES;
        if ("ENVIO_RAPIDO".equals(metodoEnvio)) {
            return "de " + v.rapidoDesdeMin() + " min a " + v.rapidoHastaHoras() + " horas";
        }
        if ("ENVIO_NORMAL_GAM".equals(metodoEnvio)) return dias(v.normalGamDesde(), v.normalGamHasta());
        if ("ENVIO_NORMAL_FUERA_GAM".equals(metodoEnvio)) return dias(v.fueraGamDesde(), v.fueraGamHasta());
        return dias(Math.min(v.normalGamDesde(), v.fueraGamDesde()), Math.max(v.normalGamHasta(), v.fueraGamHasta()));
    }

    /** Lo mismo en inglés, para el asistente: «2-4 business days», «30 min to 2 hours». */
    public static String plazoEn(String metodoEnvio) {
        Valores v = VALORES;
        if ("ENVIO_RAPIDO".equals(metodoEnvio)) return v.rapidoDesdeMin() + " min to " + v.rapidoHastaHoras() + " hours";
        if ("ENVIO_NORMAL_GAM".equals(metodoEnvio)) return diasEn(v.normalGamDesde(), v.normalGamHasta());
        if ("ENVIO_NORMAL_FUERA_GAM".equals(metodoEnvio)) return diasEn(v.fueraGamDesde(), v.fueraGamHasta());
        return diasEn(Math.min(v.normalGamDesde(), v.fueraGamDesde()), Math.max(v.normalGamHasta(), v.fueraGamHasta()));
    }

    /** Resumen en español para el prompt del asistente: GAM, fuera del GAM y rápido. */
    public static String resumen() {
        return "en el GAM " + plazo("ENVIO_NORMAL_GAM") + ", fuera del GAM " + plazo("ENVIO_NORMAL_FUERA_GAM")
            + " y envío rápido en el GAM " + plazo("ENVIO_RAPIDO");
    }

    /** Resumen en inglés para el asistente. */
    public static String resumenEn() {
        return "GAM " + plazoEn("ENVIO_NORMAL_GAM") + ", outside the GAM " + plazoEn("ENVIO_NORMAL_FUERA_GAM")
            + ", and express delivery in the GAM in " + plazoEn("ENVIO_RAPIDO");
    }

    private static String diasEn(int desde, int hasta) {
        return desde == hasta ? desde + " business days" : desde + "-" + hasta + " business days";
    }

    private static String dias(int desde, int hasta) {
        return desde == hasta ? desde + " días hábiles" : "de " + desde + " a " + hasta + " días hábiles";
    }

    static Valores cargar() {
        try (InputStream in = TiemposEnvio.class.getClassLoader().getResourceAsStream(RECURSO)) {
            if (in == null) throw new IllegalStateException("Falta " + RECURSO + " en el classpath");
            return leer(new ObjectMapper().readTree(in));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + RECURSO, e);
        }
    }

    static Valores leer(JsonNode raiz) {
        return new Valores(
            entero(raiz, "rapido", "desdeMin"), entero(raiz, "rapido", "hastaHoras"),
            entero(raiz, "normalGam", "desdeDias"), entero(raiz, "normalGam", "hastaDias"),
            entero(raiz, "fueraGam", "desdeDias"), entero(raiz, "fueraGam", "hastaDias"));
    }

    private static int entero(JsonNode raiz, String grupo, String campo) {
        JsonNode n = raiz.path(grupo).path(campo);
        if (!n.canConvertToInt() || n.asInt() <= 0) {
            throw new IllegalStateException(RECURSO + ": " + grupo + "." + campo + " debe ser un entero positivo");
        }
        return n.asInt();
    }
}
