package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AiCopilotContextBuilder {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotContextBuilder.class);

    @Autowired private AiCopilotDataQueries dataQueries;

    public enum Intent { VENTAS, INVENTARIO, CONTENIDO, OPERATIVO, GENERAL }

    public Intent detectIntent(String msg) {
        String lower = msg.toLowerCase();
        if (lower.matches(".*\\b(vend|ingres|factur|cobr|gananci|cuanto.*vendí|revenue|venta|compr.*client|client.*compr|mejor.*client).*")) return Intent.VENTAS;
        if (lower.matches(".*\\b(stock|inventari|bajo.*stock|precio|rebaj|oferta|actualiz.*product|catalog|producto).*")) return Intent.INVENTARIO;
        if (lower.matches(".*\\b(descri|instagram|whatsapp|post|redact|escrib|contenido|caption|anuncio|publicaci|seo|titul).*")) return Intent.CONTENIDO;
        if (lower.matches(".*\\b(pendiente|entreg|envi|pedido|orden|cliente.*espera|despachar|guia).*")) return Intent.OPERATIVO;
        return Intent.GENERAL;
    }

    public String buildSystemPrompt(Long empresaId, Intent intent) {
        String kpis   = getKpiContext(empresaId);
        String extra  = getDynamicData(empresaId, intent);

        String rolDescription = switch (intent) {
            case VENTAS     -> "Analizás ventas, ingresos y comportamiento de clientes. Identificás tendencias y oportunidades.";
            case INVENTARIO -> "Gestionás inventario y catálogo. Identificás productos con stock crítico y oportunidades de precio.";
            case CONTENIDO  -> "Generás contenido de venta persuasivo, optimizado para Costa Rica. Dominás el tono casual y efectivo del mercado local.";
            case OPERATIVO  -> "Revisás pedidos y operaciones. Priorizás por urgencia y ayudás a resolver cuellos de botella.";
            case GENERAL    -> "Asesorás sobre cualquier aspecto del negocio con base en los datos reales disponibles.";
        };

        return """
            Sos el Copilot de HOTCLICK, asistente de negocio para emprendedores costarricenses.
            Respondés en español con el vos costarricense. Sos directo, concreto y accionable.
            %s

            KPIs GENERALES DEL NEGOCIO:
            %s

            DATOS ESPECÍFICOS PARA ESTA CONSULTA:
            %s

            REGLAS:
            - Usá los datos inyectados arriba; nunca inventés cifras
            - Cuando generes contenido (posts, descripciones), sé persuasivo y natural, no corporativo
            - Si los datos muestran un problema, señalalo y proponé una acción concreta
            - Respondés solo sobre este negocio; si la pregunta es ajena, redirigís amablemente
            - Máximo 400 palabras por respuesta salvo que se pida contenido largo
            """.formatted(rolDescription, kpis, extra);
    }

    private String getDynamicData(Long empresaId, Intent intent) {
        try {
            return switch (intent) {
                case VENTAS     -> getVentasData(empresaId);
                case INVENTARIO -> getInventarioData(empresaId);
                case CONTENIDO  -> dataQueries.getCatalogoData(empresaId);
                case OPERATIVO  -> dataQueries.getPedidosPendientesData(empresaId);
                case GENERAL    -> "";
            };
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} intent={} datos no disponibles: {}", empresaId, intent, e.getMessage());
            return "- Datos específicos no disponibles en este momento";
        }
    }

    public String getVentasData(Long empresaId) {
        return dataQueries.getVentasData(empresaId);
    }

    public String getInventarioData(Long empresaId) {
        return dataQueries.getInventarioData(empresaId);
    }

    public String getKpiContext(Long empresaId) {
        return dataQueries.getKpiContext(empresaId);
    }

    public List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return dataQueries.getProductosSinVentaAccionables(empresaId);
    }

    public int countPedidosPendientes(Long empresaId) {
        return dataQueries.countPedidosPendientes(empresaId);
    }

    public String getRecomendacionesData(Long empresaId) {
        return dataQueries.getRecomendacionesData(empresaId);
    }

    public String getClientesData(Long empresaId) {
        return dataQueries.getClientesData(empresaId);
    }

    public String getFinanzasData(Long empresaId, JsonNode args) {
        return dataQueries.getFinanzasData(empresaId, args);
    }
}
