package com.hotclick.agente.pago;

import java.time.LocalDate;
import java.util.UUID;

/** Lo que el aviso de pago necesita, ya leído (sin entidades). Sin datos de contacto en el toString. */
public record ContextoPago(Long enlaceId, Long empresaId, UUID chatSesionId, String codigo, String numerosPedido,
                           int total, LocalDate entregaEstimada, int rechazos) {
    @Override
    public String toString() {
        return "ContextoPago[enlace=" + enlaceId + ", rechazos=" + rechazos + "]";
    }
}
