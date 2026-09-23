package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Una corrida del inspector I1. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record InspectionRunDto(
        String id,
        String ranAt,
        String source,
        String repoRoot,
        InspectionSummaryDto summary,
        List<AgentInspectionDto> agents
) {
    public List<AgentInspectionDto> agentsOrEmpty() {
        return agents == null ? List.of() : agents;
    }
}
