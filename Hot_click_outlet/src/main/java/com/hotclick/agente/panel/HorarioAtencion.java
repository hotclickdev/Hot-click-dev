package com.hotclick.agente.panel;

import com.hotclick.utils.Constants;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Horario semanal de atención de un negocio (AG-19), siempre en hora de Costa Rica. Un tramo por día
 * ({@code desde} y {@code hasta} en HH:mm, sin cruzar medianoche). Un día sin entrada se toma como cerrado.
 */
public final class HorarioAtencion {

    public static final ZoneId ZONA = Constants.ZONA_CR;

    /** @param dia LUNES..DOMINGO */
    public record Dia(String dia, boolean abierto, String desde, String hasta) {}

    static final List<String> DIAS = List.of("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO");

    private final Map<DayOfWeek, Dia> porDia = new EnumMap<>(DayOfWeek.class);

    private HorarioAtencion() {}

    /** Valida y arma el horario; lanza {@link IllegalArgumentException} con un mensaje para la persona. */
    public static HorarioAtencion de(List<Dia> dias) {
        HorarioAtencion h = new HorarioAtencion();
        if (dias == null) return h;
        for (Dia d : dias) {
            if (d == null || d.dia() == null) throw new IllegalArgumentException("Horario inválido");
            DayOfWeek dow = diaDe(d.dia());
            if (h.porDia.containsKey(dow)) throw new IllegalArgumentException("Día repetido en el horario");
            if (d.abierto()) {
                LocalTime desde = hora(d.desde());
                LocalTime hasta = hora(d.hasta());
                if (!desde.isBefore(hasta))
                    throw new IllegalArgumentException("La hora de cierre debe ser posterior a la de apertura");
            }
            h.porDia.put(dow, d);
        }
        return h;
    }

    /** Horario por defecto al activar la función: lunes a viernes de 8:00 a 17:00. */
    public static List<Dia> porDefecto() {
        List<Dia> l = new ArrayList<>();
        for (int i = 0; i < DIAS.size(); i++) {
            boolean laboral = i < 5;
            l.add(new Dia(DIAS.get(i), laboral, "08:00", "17:00"));
        }
        return l;
    }

    public boolean abiertoEn(Instant momento) {
        ZonedDateTime z = momento.atZone(ZONA);
        Dia d = porDia.get(z.getDayOfWeek());
        if (d == null || !d.abierto()) return false;
        LocalTime t = z.toLocalTime();
        return !t.isBefore(hora(d.desde())) && t.isBefore(hora(d.hasta()));
    }

    static DayOfWeek diaDe(String dia) {
        int i = DIAS.indexOf(dia.trim().toUpperCase(Locale.ROOT));
        if (i < 0) throw new IllegalArgumentException("Día inválido en el horario");
        return DayOfWeek.of(i + 1);
    }

    private static LocalTime hora(String texto) {
        if (texto == null) throw new IllegalArgumentException("Falta una hora en el horario");
        try {
            return LocalTime.parse(texto.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Hora inválida (use HH:mm)");
        }
    }
}
