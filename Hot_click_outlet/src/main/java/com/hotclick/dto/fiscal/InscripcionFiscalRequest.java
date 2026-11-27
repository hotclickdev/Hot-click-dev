package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/empresa/fiscal/inscripcion ("Ya me inscribí"). La empresa sale de la sesión, nunca del cuerpo. */
public record InscripcionFiscalRequest(
    @NotBlank @Pattern(regexp = "INSCRITO|REGIMEN_SIMPLIFICADO", message = "Situación inválida") String situacion,
    @NotBlank @Size(max = 20) String cedula,
    @NotBlank @Size(min = 2, max = 150) String nombre,
    @NotBlank @Size(min = 2, max = 150) String actividad,
    @NotBlank @Size(max = 150) String correo) {}
