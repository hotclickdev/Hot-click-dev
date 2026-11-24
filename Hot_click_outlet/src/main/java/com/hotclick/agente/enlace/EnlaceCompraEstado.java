package com.hotclick.agente.enlace;

/**
 * Estados del enlace. AG-07/AG-09 manejan CREADO, ABIERTO y VENCIDO; PAGADO, RECHAZADO y los recordatorios los
 * resuelven AG-08 y AG-12 a través de {@link EnlaceCompraEstadoService}.
 */
public enum EnlaceCompraEstado {
    CREADO, ABIERTO, PAGADO, RECHAZADO, VENCIDO, CANCELADO;

    /** Se puede abrir de nuevo: tras un pago rechazado el cliente reintenta con el mismo enlace. */
    public boolean permiteAbrir() {
        return this == CREADO || this == ABIERTO || this == RECHAZADO;
    }
}
