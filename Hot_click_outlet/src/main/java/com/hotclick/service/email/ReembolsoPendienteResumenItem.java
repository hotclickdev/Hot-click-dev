package com.hotclick.service.email;

import java.time.LocalDateTime;

/**
 * Fila del correo resumen de REEMBOLSO_PENDIENTE viejos (punto 4 de #477): id, monto, moneda, fecha y origen.
 * Sin PII.
 */
public record ReembolsoPendienteResumenItem(Long pagoId, Integer monto, String moneda, LocalDateTime fecha, Origen origen) {

    /** Origen del reembolso pendiente, deducido del estado guardado (no hay columna de origen). */
    public enum Origen {
        ONVO_CANCELADO("Cobro ONVO sobre pedido cancelado"),
        SINPE("SINPE"),
        SOBREVENTA("Sobreventa"),
        OTRO("Otro (origen no determinable)");

        private final String titulo;
        Origen(String titulo) { this.titulo = titulo; }
        public String titulo() { return titulo; }
    }

    public ReembolsoPendienteResumenItem(Long pagoId, Integer monto, String moneda, LocalDateTime fecha) {
        this(pagoId, monto, moneda, fecha, Origen.OTRO);
    }
}
