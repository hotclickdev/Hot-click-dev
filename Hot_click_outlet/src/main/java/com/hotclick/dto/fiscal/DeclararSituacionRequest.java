package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Cuerpo de PUT /api/empresa/fiscal/situacion (primera declaración del negocio). */
public record DeclararSituacionRequest(
    @NotBlank @Pattern(regexp = "INSCRITO|REGIMEN_SIMPLIFICADO|NO_INSCRITO", message = "Situación inválida") String situacion) {}
