package com.hotclick.service.consola;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Un día hábil hacia atrás, saltando sábado y domingo. */
public final class DiaHabil {

    private DiaHabil() {}

    public static LocalDateTime haceUno(LocalDateTime ahora) {
        LocalDate dia = ahora.toLocalDate().minusDays(1);
        while (esFinDeSemana(dia)) {
            dia = dia.minusDays(1);
        }
        return dia.atTime(ahora.toLocalTime());
    }

    private static boolean esFinDeSemana(LocalDate dia) {
        DayOfWeek dow = dia.getDayOfWeek();
        return DayOfWeek.SATURDAY.equals(dow) || DayOfWeek.SUNDAY.equals(dow);
    }
}
