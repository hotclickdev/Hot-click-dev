package com.hotclick.dto.agentes;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Fila del catálogo I1 (docs/AGENTES_*.md).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AgentRecordDto(
        String id,
        String name,
        String cadence,
        int ola,
        String workflow,
        String script,
        String doc,
        String triggerHint,
        String skipLabel
) {
}
