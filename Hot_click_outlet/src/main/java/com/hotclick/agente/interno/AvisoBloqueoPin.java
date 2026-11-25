package com.hotclick.agente.interno;

import java.time.Duration;

/** Aviso al dueño cuando el PIN del modo interno queda bloqueado por un tiempo largo (AG-14 H-05). */
@FunctionalInterface
public interface AvisoBloqueoPin {

    /** Sin datos personales: solo la empresa y cuánto dura el bloqueo. Nunca debe lanzar excepciones. */
    void bloqueoLargo(Long empresaId, Duration duracion);
}
