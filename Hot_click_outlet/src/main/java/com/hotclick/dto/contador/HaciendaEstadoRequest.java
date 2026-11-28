package com.hotclick.dto.contador;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PUT /api/admin/contador/hacienda/{clave}: el dueño marca si Hacienda ya confirmó la consulta. */
public record HaciendaEstadoRequest(@NotNull Boolean confirmada) {}
