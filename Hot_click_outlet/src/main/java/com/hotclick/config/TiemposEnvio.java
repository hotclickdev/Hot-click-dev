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
    /** Ventana del envío rápido (Uber Flash), horas en Costa Rica: [desde, hasta). */
    private static final int[] VENTANA_RAPIDO = cargarVentanaRapido();

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

    /** Hora (inclusive) desde la que sale el envío rápido. */
    public static int ventanaRapidoDesde() { return VENTANA_RAPIDO[0]; }
    /** Hora (exclusiva) hasta la que sale el envío rápido. */
    public static int ventanaRapidoHasta() { return VENTANA_RAPIDO[1]; }

    /**
     * Día en que sale un envío rápido pedido en {@code ahora} (hora de Costa Rica): hoy si cae en la
     * ventana; si entra después del cierre, al día siguiente; si entra antes de abrir, ese mismo día.
     */
    public static java.time.LocalDate diaSalidaRapido(java.time.LocalDateTime ahora) {
        int h = ahora.getHour();
        if (h >= VENTANA_RAPIDO[1]) return ahora.toLocalDate().plusDays(1);
        return ahora.toLocalDate();
    }

    /** true si el pedido rápido queda en cola (fuera de la ventana). */
    public static boolean rapidoEnCola(java.time.LocalDateTime ahora) {
        int h = ahora.getHour();
        return h < VENTANA_RAPIDO[0] || h >= VENTANA_RAPIDO[1];
    }

    static int[] cargarVentanaRapido() {
        try (InputStream in = TiemposEnvio.class.getClassLoader().getResourceAsStream(RECURSO)) {
            if (in == null) throw new IllegalStateException("Falta " + RECURSO + " en el classpath");
            JsonNode raiz = new ObjectMapper().readTree(in);
            int desde = entero(raiz, "rapido", "ventanaDesdeHora");
            int hasta = entero(raiz, "rapido", "ventanaHastaHora");
            if (desde >= hasta || hasta > 24) throw new IllegalStateException(RECURSO + ": ventana del rápido inválida");
            return new int[]{desde, hasta};
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + RECURSO, e);
        }
    }
}
