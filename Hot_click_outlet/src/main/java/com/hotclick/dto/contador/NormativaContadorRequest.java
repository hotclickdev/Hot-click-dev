package com.hotclick.dto.contador;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/admin/contador/normativa: un documento del corpus tributario que lee la IA. */
public record NormativaContadorRequest(
    @NotBlank @Size(max = 200) String titulo,
    @NotBlank @Size(max = 300) String fuente,
    @NotBlank @Size(min = 20, max = 20_000) String texto) {}
