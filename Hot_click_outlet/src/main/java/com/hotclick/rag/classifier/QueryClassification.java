package com.hotclick.rag.classifier;

/**
 * Resultado de clasificación de una consulta del asistente.
 *
 * - PRODUCTO / COMPRA / SOPORTE → consulta válida, procesar con el pipeline RAG.
 * - FUERA_DE_DOMINIO → bloquear antes de cualquier llamada a Voyage o Claude.
 * - PROMPT_INJECTION → bloquear y registrar como intento de manipulación.
 */
public enum QueryClassification {
    PRODUCTO,
    COMPRA,
    SOPORTE,
    FUERA_DE_DOMINIO,
    PROMPT_INJECTION;

    public boolean isAllowed() {
        return this != FUERA_DE_DOMINIO && this != PROMPT_INJECTION;
    }

    public boolean isInjection() {
        return this == PROMPT_INJECTION;
    }
}
