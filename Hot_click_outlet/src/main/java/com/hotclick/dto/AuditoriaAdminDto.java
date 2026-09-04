package com.hotclick.dto;

import java.time.LocalDateTime;

/** Evento de auditoría admin (solo lectura). */
public record AuditoriaAdminDto(
        Long id,
        Long adminId,
        String adminEmail,
        String accion,
        String entidad,
        Long entidadId,
        String detalle,
        LocalDateTime fecha,
        Long empresaId,
        String empresaNombre
) {
}
