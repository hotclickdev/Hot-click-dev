package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Historial I1 persistido. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record InspectionsFileDto(String updatedAt, List<InspectionRunDto> runs) {
    public static InspectionsFileDto vacio() {
        return new InspectionsFileDto(null, List.of());
    }

    public List<InspectionRunDto> runsOrEmpty() {
        return runs == null ? List.of() : runs;
    }
}
