package com.hotclick.dto;

import jakarta.validation.constraints.Size;

/**
 * P2-02: cuerpo tipado de POST /api/public/tienda-rapida/{token}. Las reglas de formato
 * (cédula, clave, correo) siguen en TiendaRapidaReglas; aquí solo se fijan tipos y topes de
 * tamaño para que un payload arbitrario no llegue al servicio.
 */
public record TiendaRapidaAceptarDTO(
    Boolean acepto,
    @Size(max = 40) String versionLegal,
    @Size(max = 150) String persona,
    @Size(max = 30) String cedula,
    @Size(max = 150) String correo,
    @Size(max = 30) String telefono,
    @Size(max = 128) String clave
) {}
