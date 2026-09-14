package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Resultado I1 de un ID conocido. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AgentInspectionDto(
        String id,
        String status,
        boolean workflowFound,
        String workflowFile,
        boolean docsFound,
        boolean scriptFound,
        boolean cadenceMatch,
        List<String> notes
) {
}
