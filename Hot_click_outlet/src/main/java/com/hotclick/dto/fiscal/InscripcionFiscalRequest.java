package com.hotclick.dto.fiscal;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cuerpo de POST /api/empresa/fiscal/inscripcion ("Ya me inscribí"). La empresa sale de la sesión, nunca del cuerpo. */
public record InscripcionFiscalRequest(
    @NotBlank @Pattern(regexp = "INSCRITO|REGIMEN_SIMPLIFICADO", message = "Situación inválida") String situacion,
    @NotBlank @Size(max = 20) String cedula,
    @NotBlank @Size(min = 2, max = 150) String nombre,
    @NotBlank @Size(min = 2, max = 150) String actividad,
    // @Email deja pasar "a@b"; el patrón exige un dominio con punto.
    @NotBlank @Email(message = "El correo para facturas no es válido") @Size(max = 150)
    @Pattern(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s.]+$", message = "El correo para facturas necesita un dominio con punto") String correo,
    // Declaración jurada obligatoria: sin aceptarla la respuesta es 400.
    @NotNull(message = "Tenés que aceptar la declaración") @AssertTrue(message = "Tenés que aceptar la declaración") Boolean aceptaDeclaracion) {}
