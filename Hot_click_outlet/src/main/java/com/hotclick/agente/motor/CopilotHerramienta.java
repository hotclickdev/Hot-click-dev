package com.hotclick.agente.motor;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.service.copilot.AiCopilotToolExecutor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Adaptador de una herramienta del copilot existente ({@link AiCopilotToolExecutor}) para el perfil
 * NEGOCIO_INTERNO. No duplica lógica: delega la ejecución en el copilot. Siempre en modo solo lectura
 * ({@code esDueno=false}, sin herramientas {@code proponer_*}): finanzas y mutaciones quedan fuera de este canal.
 */
final class CopilotHerramienta implements HerramientaAgente {

    private final String nombre;
    private final String descripcion;
    private final Map<String, Object> schema;
    private final AiCopilotToolExecutor copilot;

    @SuppressWarnings("unchecked")
    CopilotHerramienta(Map<String, Object> definicionCopilot, AiCopilotToolExecutor copilot) {
        this.nombre = String.valueOf(definicionCopilot.get("name"));
        this.descripcion = String.valueOf(definicionCopilot.get("description"));
        this.copilot = copilot;
        Map<String, Object> original = (Map<String, Object>) definicionCopilot.get("input_schema");
        Map<String, Object> copia = new LinkedHashMap<>(original == null ? Map.of("type", "object") : original);
        copia.putIfAbsent("properties", Map.of());
        copia.putIfAbsent("required", List.of());
        copia.put("additionalProperties", false); // requisito de strict
        this.schema = copia;
    }

    @Override public String nombre() { return nombre; }
    @Override public String descripcion() { return descripcion; }
    @Override public Map<String, Object> inputSchema() { return schema; }

    @Override
    public ResultadoHerramienta ejecutar(ContextoHerramienta contexto, JsonNode input) {
        String resultado = copilot.ejecutarTool(contexto.empresaId(), nombre, input, new AccionPropuestaTelegram[1], false);
        return ResultadoHerramienta.ok(resultado == null ? "" : resultado);
    }
}
