package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Evento de embudo. La clave es un UUID, nunca un correo. */
public record EmbudoRegistroRequest(
    @NotBlank
    @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    String sessionKey,
    @NotBlank String paso,
    String motivo,
    Integer monto
) {}
