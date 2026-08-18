package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Empresa;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AiCopilotToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotToolExecutor.class);

    @Autowired private AiCopilotContextBuilder contextBuilder;
    @Autowired private AiCopilotToolDefinitions toolDefinitions;
    @Autowired private AiCopilotMutationTools   mutationTools;

    // ── Tool-calling (Telegram y panel admin) ────────────────────────────────
    // El panel usa las mismas tools de consulta; las de mutación (proponer_*)
    // solo se exponen en Telegram con confirmación por botón.

    public String buildSystemPromptConTools(Long empresaId, Empresa empresa, String nombreUsuario, boolean puedeGestionar) {
        return toolDefinitions.buildSystemPromptConTools(empresaId, empresa, nombreUsuario, puedeGestionar);
    }

    public List<Map<String, Object>> buildTools(Long empresaId, boolean puedeGestionar) {
        return toolDefinitions.buildTools(empresaId, puedeGestionar);
    }

    /** Verifica el feature "reportes" sin depender del TenantContext ambiente — el webhook de Telegram es público y no lo setea. */
    boolean tieneFeatureReportes(Long empresaId) {
        return toolDefinitions.tieneFeatureReportes(empresaId);
    }

    /** Formato de tool de la Messages API de Claude — plano, sin la envoltura {type:"function", function:{...}} de OpenAI. */
    Map<String, Object> toolDef(String name, String description, Map<String, Object> parameters) {
        return toolDefinitions.toolDef(name, description, parameters);
    }

    public String ejecutarTool(Long empresaId, String nombre, JsonNode args, AccionPropuestaTelegram[] accionHolder) {
        try {
            return switch (nombre) {
                case "consultar_inventario" -> contextBuilder.getInventarioData(empresaId);
                case "consultar_ventas"     -> contextBuilder.getVentasData(empresaId);
                case "recomendaciones"      -> contextBuilder.getRecomendacionesData(empresaId);
                case "consultar_clientes"   -> contextBuilder.getClientesData(empresaId);
                case "consultar_finanzas"   -> contextBuilder.getFinanzasData(empresaId, args);
                case "proponer_cambiar_estado_pedido" -> mutationTools.proponerCambiarEstadoPedido(empresaId, args, accionHolder);
                case "proponer_asignar_guia"          -> mutationTools.proponerAsignarGuia(empresaId, args, accionHolder);
                case "proponer_ajustar_stock"         -> mutationTools.proponerAjustarStock(empresaId, args, accionHolder);
                case "proponer_aplicar_oferta"        -> mutationTools.proponerAplicarOferta(empresaId, args, accionHolder);
                default -> "Herramienta desconocida: " + nombre;
            };
        } catch (DataAccessException e) {
            log.warn("[AI-tool] empresaId={} tool={} datos no disponibles: {}", empresaId, nombre, e.getMessage());
            return "No se pudo obtener el dato en este momento.";
        }
    }
}
