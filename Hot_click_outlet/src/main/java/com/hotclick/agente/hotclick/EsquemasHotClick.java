package com.hotclick.agente.hotclick;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** JSON Schema compatible con {@code strict: true} para las herramientas de HotClick. */
final class EsquemasHotClick {

    private EsquemasHotClick() {}

    static Map<String, Object> objeto(Map<String, Object> propiedades, List<String> requeridas) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", propiedades);
        schema.put("required", requeridas);
        schema.put("additionalProperties", false);
        return schema;
    }

    static Map<String, Object> texto(String descripcion) {
        return Map.of("type", "string", "description", descripcion);
    }
}
