package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Resumen de una ola de agentes en master. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OlaRecordDto(
        int n,
        String status,
        Integer pr,
        String doc,
        String title,
        List<String> ids,
        String summary
) {
}
