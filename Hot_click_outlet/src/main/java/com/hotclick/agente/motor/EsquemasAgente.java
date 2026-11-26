package com.hotclick.agente.motor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Constructores de JSON Schema compatibles con {@code strict: true} (additionalProperties false + required). */
final class EsquemasAgente {

    private EsquemasAgente() {}

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

    static Map<String, Object> entero(String descripcion) {
        return Map.of("type", "integer", "description", descripcion);
    }
}
