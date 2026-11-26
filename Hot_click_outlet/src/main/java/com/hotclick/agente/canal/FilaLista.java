package com.hotclick.agente.canal;

/** Fila de una lista (WhatsApp, máx. 10). {@code descripcion} es opcional. */
public record FilaLista(String id, String titulo, String descripcion) {
    public FilaLista(String id, String titulo) { this(id, titulo, null); }
}
