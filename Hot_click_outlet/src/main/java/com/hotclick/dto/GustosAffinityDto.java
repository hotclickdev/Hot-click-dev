package com.hotclick.dto;

import java.util.List;
import java.util.Map;

/** Scores de afinidad para Descubrí / "Según tus gustos" (compatible con frontend gustos.ts). */
public record GustosAffinityDto(
    Map<String, Double> scores,
    List<String> selectedCategoryIds,
    List<String> selectedPriceBands,
    boolean fromBackend
) {
    public static GustosAffinityDto empty() {
        return new GustosAffinityDto(Map.of(), List.of(), List.of(), false);
    }
}
