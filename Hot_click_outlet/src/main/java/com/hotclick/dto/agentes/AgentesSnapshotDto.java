package com.hotclick.dto.agentes;

/**
 * Payload de GET /api/admin/agentes.
 * Catálogo de ingeniería de la plataforma: no es dato de tenant.
 */
public record AgentesSnapshotDto(
        CatalogFileDto catalogo,
        OlasFileDto olas,
        InspectionsFileDto inspecciones,
        boolean liveInspectAvailable
) {
}
