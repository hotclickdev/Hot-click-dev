package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Catálogo semilla de agentes de ingeniería. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogFileDto(
        String repo,
        List<String> generatedFrom,
        List<AgentRecordDto> agents
) {
    public static CatalogFileDto vacio() {
        return new CatalogFileDto("hotclickdev/Hot-click-dev", List.of(), List.of());
    }

    public List<AgentRecordDto> agentsOrEmpty() {
        return agents == null ? List.of() : agents;
    }
}
