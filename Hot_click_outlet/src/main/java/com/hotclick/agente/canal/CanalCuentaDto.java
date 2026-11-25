package com.hotclick.agente.canal;

import java.time.LocalDateTime;

/** Vista pública de una cuenta: nunca incluye el token, ni cifrado. */
public record CanalCuentaDto(
        Long id,
        String tipo,
        Long empresaId,
        String idExterno,
        String wabaId,
        String nombre,
        String estado,
        boolean tieneToken,
        LocalDateTime fechaCreacion) {

    public static CanalCuentaDto de(CanalCuenta c) {
        return new CanalCuentaDto(c.getId(), c.getTipo().name(), c.getEmpresaId(), c.getIdExterno(), c.getWabaId(),
            c.getNombre(), c.getEstado().name(), c.tieneToken(), c.getFechaCreacion());
    }
}
