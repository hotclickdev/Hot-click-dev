package com.hotclick.dto.contador;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/admin/contador/preguntar. */
public record PreguntaContadorRequest(@NotBlank @Size(max = 600) String pregunta) {}
