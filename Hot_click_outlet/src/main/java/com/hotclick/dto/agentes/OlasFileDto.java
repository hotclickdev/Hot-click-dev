package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Plan de olas 1–7. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OlasFileDto(
        int totalOlas,
        int onMaster,
        String headline,
        String note,
        List<OlaRecordDto> olas
) {
    public static OlasFileDto vacio() {
        return new OlasFileDto(7, 0, "", "", List.of());
    }

    public List<OlaRecordDto> olasOrEmpty() {
        return olas == null ? List.of() : olas;
    }
}
