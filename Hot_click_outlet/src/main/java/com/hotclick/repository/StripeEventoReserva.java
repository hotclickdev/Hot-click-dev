package com.hotclick.repository;

import java.time.LocalDateTime;

/** Fragmento de {@link StripeEventoRepository}: reserva atómica de una clave de idempotencia. */
public interface StripeEventoReserva {

    /** SQL de PostgreSQL usada en producción (la lee también StripeEventoReservaPostgresTest). */
    String SQL_RESERVA_PG = """
        INSERT INTO hot_click_stripe_evento_tb (stripe_event_id, tipo, procesado_ok, fecha_recibido, fecha_procesado)
        VALUES (?, ?, TRUE, ?, ?)
        ON CONFLICT (stripe_event_id) DO NOTHING
        """;

    /**
     * Devuelve 1 si esta transacción creó la clave y 0 si ya existía. En PostgreSQL es un único
     * INSERT ... ON CONFLICT DO NOTHING: una transacción concurrente con la misma clave espera en el índice de la
     * PK hasta que la primera termina (si confirma recibe 0; si revierte, la inserta ella). Se inserta ya
     * procesada porque solo se confirma junto con el cambio de plan, en la misma transacción.
     */
    int reservar(String id, String tipo, LocalDateTime ahora);
}
