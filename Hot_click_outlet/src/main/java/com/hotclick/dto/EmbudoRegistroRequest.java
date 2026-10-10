package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Evento de embudo. La clave es un UUID, nunca un correo. */
public record EmbudoRegistroRequest(
    @NotBlank
    @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    String sessionKey,
    @NotBlank @Size(max = 40) @Pattern(regexp = "^[A-Za-z0-9_-]+$") String paso,
    @Size(max = 200) String motivo,
    @Min(0) @Max(100_000_000) Integer monto
) {}
