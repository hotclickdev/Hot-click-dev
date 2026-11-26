package com.hotclick.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Motivo obligatorio para liberar la marca del primer mes gratis de un negocio (soporte). */
public record LiberarPrimerMesGratisRequest(@NotBlank @Size(max = 300) String motivo) {}
