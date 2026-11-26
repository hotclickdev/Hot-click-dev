package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Herramienta que el motor puede ofrecer a Claude. Las implementaciones son beans de Spring y el
 * {@link RegistroHerramientas} las filtra por perfil: un perfil solo ve (y solo puede ejecutar) las
 * herramientas de su lista en {@link PerfilAgente#herramientas()}.
 */
public interface HerramientaAgente {

    /** Nombre único (snake_case) tal como lo ve el modelo. */
    String nombre();

    String descripcion();

    /** JSON Schema del input. Debe tener {@code additionalProperties:false} y {@code required} (se usa con strict). */
    Map<String, Object> inputSchema();

    /** false para stubs de historias pendientes: no se ofrecen al modelo hasta que exista la implementación real. */
    default boolean disponible() {
        return true;
    }

    /**
     * Ejecuta la herramienta. {@code input} ya es un objeto JSON, pero sus valores los generó el modelo:
     * hay que validarlos. Empresa y contacto salen del contexto, nunca del input.
     */
    ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input);

    /** Definición en formato Messages API con {@code strict: true}. */
    default Map<String, Object> definicion() {
        Map<String, Object> def = new LinkedHashMap<>();
        def.put("name", nombre());
        def.put("description", descripcion());
        def.put("input_schema", inputSchema());
        def.put("strict", true);
        return def;
    }
}
