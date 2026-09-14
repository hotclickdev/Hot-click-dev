package com.hotclick.dto.agentes;

/** Resultado de POST /api/admin/agentes/inspecciones. */
public record AgentesInspectResultDto(
        InspectionRunDto run,
        boolean persisted,
        boolean liveInspectAvailable,
        String hint
) {
}
