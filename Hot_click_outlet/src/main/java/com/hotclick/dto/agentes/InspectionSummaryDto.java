package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** Conteos I1 por estado. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record InspectionSummaryDto(
        @JsonProperty("al_dia") int alDia,
        int activar,
        int actualizar,
        int mejorar
) {
    public static InspectionSummaryDto vacio() {
        return new InspectionSummaryDto(0, 0, 0, 0);
    }
}
