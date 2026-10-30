package com.hotclick.dto;

import com.hotclick.model.PosSinpeConfirmacion;

import java.time.LocalDateTime;

/**
 * Vista de la revisión de confirmaciones SINPE del POS: solo los campos que la pantalla necesita. No se devuelve la
 * entidad cruda para que un campo nuevo (número SINPE, teléfono, IBAN) no salga por esta ruta sin decidirlo acá.
 */
public record PosSinpeConfirmacionDTO(
        Long id,
        Long empresaId,
        Long sesionId,
        Long pedidoId,
        String referencia,
        Integer total,
        Long generadoPorId,
        Long confirmadoPorId,
        LocalDateTime fechaConfirmacion) {

    public static PosSinpeConfirmacionDTO de(PosSinpeConfirmacion c) {
        return new PosSinpeConfirmacionDTO(c.getId(), c.getEmpresaId(), c.getSesionId(), c.getPedidoId(),
            c.getReferencia(), c.getTotal(), c.getGeneradoPorId(), c.getConfirmadoPorId(), c.getFechaConfirmacion());
    }
}
