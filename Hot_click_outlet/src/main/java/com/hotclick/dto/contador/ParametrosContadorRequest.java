package com.hotclick.dto.contador;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * Cuerpo de PUT /api/admin/contador/parametros: clave a valor. Solo se aceptan las claves conocidas
 * ({@code ContadorParametrosService}); cualquier otra responde 400 sin guardar nada.
 */
public record ParametrosContadorRequest(
    @NotNull @NotEmpty @Size(max = 30) Map<@NotNull @Size(max = 60) String, @Size(max = 400) String> parametros) {}
