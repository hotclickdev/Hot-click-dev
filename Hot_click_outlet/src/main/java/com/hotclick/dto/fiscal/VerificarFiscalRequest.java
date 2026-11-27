package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/admin/empresas/{id}/fiscal/verificar. */
public record VerificarFiscalRequest(
    @NotBlank @Pattern(regexp = "APROBAR|RECHAZAR", message = "Decisión inválida") String decision,
    @Size(max = 200) String motivo) {}
