package com.hotclick.agente.motor;

import com.hotclick.service.ai.UsoTokens;

import java.util.List;

/**
 * Resultado de {@link MotorAgente#ejecutar}.
 *
 * @param texto       respuesta para el cliente (nunca null; en fallos es un mensaje de derivación)
 * @param acciones    señales para el canal (PASAR_A_PERSONA, ENLACE_CREADO…), sin repetidos
 * @param uso         tokens acumulados de todas las vueltas (entrada, salida, caché)
 * @param costoUsd    costo estimado en USD según {@code ClaudePrecios}
 * @param modelo      modelo usado
 * @param motivoFin   por qué terminó
 * @param iteraciones llamadas a Claude realizadas
 */
public record ResultadoAgente(String texto, List<AccionAgente> acciones, UsoTokens uso, double costoUsd,
                              String modelo, MotivoFin motivoFin, int iteraciones) {

    public ResultadoAgente {
        texto = texto == null ? "" : texto;
        acciones = acciones == null ? List.of() : List.copyOf(acciones);
        uso = uso == null ? UsoTokens.VACIO : uso;
    }

    /** Sin el texto de la respuesta (AG-14 H-07). */
    @Override
    public String toString() {
        return "ResultadoAgente[motivoFin=" + motivoFin + ", acciones=" + acciones.size() + ", iteraciones="
            + iteraciones + "]";
    }

    public int tokensEntrada() { return uso.entrada(); }

    public int tokensSalida() { return uso.salida(); }

    public boolean pasarAPersona() {
        return acciones.stream().anyMatch(a -> a.tipo() == AccionAgente.Tipo.PASAR_A_PERSONA);
    }
}
