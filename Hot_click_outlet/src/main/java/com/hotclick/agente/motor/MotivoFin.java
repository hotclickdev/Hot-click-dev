package com.hotclick.agente.motor;

/** Por qué terminó una ejecución del motor. */
public enum MotivoFin {
    /** Claude terminó con una respuesta de texto. */
    COMPLETO,
    /** Claude rechazó la solicitud (stop_reason refusal); se deriva a una persona. */
    REFUSAL,
    /** La respuesta se cortó por max_tokens; se deriva a una persona. */
    MAX_TOKENS,
    /** Se alcanzó el tope de vueltas de herramientas sin respuesta final. */
    TOPE_ITERACIONES,
    /** Se acabó el presupuesto de tiempo del bucle. */
    TIEMPO_AGOTADO,
    /** La entrada no pasó la moderación o el guard legal; no se llamó a Claude. */
    MODERACION,
    /** Entrada vacía; no se llamó a Claude. */
    ENTRADA_VACIA,
    /** Claude no estuvo disponible (HTTP, timeout, circuit breaker abierto) o respondió algo inválido. */
    ERROR_PROVEEDOR
}
