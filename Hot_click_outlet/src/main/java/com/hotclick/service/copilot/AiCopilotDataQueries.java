package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Fachada de consultas SQL de contexto dinámico del Copilot admin.
 * Delega por dominio — no cambia comportamiento.
 */
@Component
class AiCopilotDataQueries {

    @Autowired private AiCopilotVentasQueries ventasQueries;
    @Autowired private AiCopilotStockQueries stockQueries;
    @Autowired private AiCopilotClientesQueries clientesQueries;
    @Autowired private AiCopilotCatalogoQueries catalogoQueries;
    @Autowired private AiCopilotPedidosQueries pedidosQueries;
    @Autowired private AiCopilotFinanzasQueries finanzasQueries;
    @Autowired private AiCopilotReporteQueries reporteQueries;
    @Autowired private AiCopilotMercadoQueries mercadoQueries;
    @Autowired private AiCopilotProyeccionQueries proyeccionQueries;
    @Autowired private AiCopilotMarcaQueries marcaQueries;

    String getVentasData(Long empresaId) {
        return ventasQueries.getVentasData(empresaId);
    }

    String getInventarioData(Long empresaId) {
        return stockQueries.getInventarioData(empresaId);
    }

    String getCatalogoData(Long empresaId) {
        return catalogoQueries.getCatalogoData(empresaId);
    }

    String getPedidosPendientesData(Long empresaId) {
        return pedidosQueries.getPedidosPendientesData(empresaId);
    }

    String getKpiContext(Long empresaId) {
        return ventasQueries.getKpiContext(empresaId);
    }

    List<Map<String, Object>> getProductosSinVentaAccionables(Long empresaId) {
        return stockQueries.getProductosSinVentaAccionables(empresaId);
    }

    int countPedidosPendientes(Long empresaId) {
        return pedidosQueries.countPedidosPendientes(empresaId);
    }

    String getRecomendacionesData(Long empresaId) {
        return stockQueries.getRecomendacionesData(empresaId);
    }

    String getClientesData(Long empresaId) {
        return clientesQueries.getClientesData(empresaId);
    }

    String getFinanzasData(Long empresaId, JsonNode args) {
        return finanzasQueries.getFinanzasData(empresaId, args);
    }

    String getReporteNegocio(Long empresaId, JsonNode args) {
        return reporteQueries.getReporteNegocio(empresaId, args);
    }

    String compararCatalogoPublico(Long empresaId) {
        return mercadoQueries.compararCatalogoPublico(empresaId);
    }

    String getProyeccion(Long empresaId) {
        return proyeccionQueries.getProyeccion(empresaId);
    }

    String getPerfilMarca(Long empresaId) {
        return marcaQueries.getPerfilMarca(empresaId);
    }

    Map<String, Object> getInsights(Long empresaId) {
        return stockQueries.getInsights(empresaId);
    }
}
