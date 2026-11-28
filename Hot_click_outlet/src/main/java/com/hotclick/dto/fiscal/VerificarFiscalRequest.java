package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de POST /api/admin/empresas/{id}/fiscal/verificar. {@code huella} es la que devolvió el detalle que el ADMIN
 * estaba viendo: si el negocio cambió sus datos entretanto, la respuesta es 409.
 */
public record VerificarFiscalRequest(
    @NotBlank @Pattern(regexp = "APROBAR|RECHAZAR", message = "Decisión inválida") String decision,
    @Size(max = 200) String motivo,
    @NotBlank @Size(max = 64) String huella) {}
