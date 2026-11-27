package com.hotclick.service.fiscal.fec;

import com.hotclick.service.consola.QuincenaCalculo;

import java.time.LocalDate;

/** Quincena calendario: 1 al 15 o 16 a fin de mes (misma regla que el cierre de quincena de la consola). */
public record FecPeriodo(LocalDate desde, LocalDate hasta) {

    public FecPeriodo {
        if (desde == null || hasta == null || hasta.isBefore(desde)) {
            throw new IllegalArgumentException("periodo inválido");
        }
    }

    /** La quincena que contiene {@code dia}. */
    public static FecPeriodo de(LocalDate dia) {
        return new FecPeriodo(QuincenaCalculo.inicio(dia), QuincenaCalculo.fin(dia));
    }

    /** La quincena ya cerrada justo antes de {@code hoy}. */
    public static FecPeriodo anteriorA(LocalDate hoy) {
        return de(QuincenaCalculo.inicio(hoy).minusDays(1));
    }

    /** Solo se aceptan quincenas completas y ya cerradas. */
    public static FecPeriodo cerrada(LocalDate desde, LocalDate hasta, LocalDate hoy) {
        FecPeriodo p = new FecPeriodo(desde, hasta);
        if (!p.equals(de(desde))) {
            throw new IllegalArgumentException("El periodo debe ser una quincena completa (1-15 o 16-fin de mes)");
        }
        if (!hasta.isBefore(hoy)) {
            throw new IllegalArgumentException("La quincena todavía no cierra");
        }
        return p;
    }
}
