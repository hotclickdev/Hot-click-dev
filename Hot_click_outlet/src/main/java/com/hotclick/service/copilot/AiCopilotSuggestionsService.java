package com.hotclick.service.copilot;

import com.hotclick.service.InventoryForecastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiCopilotSuggestionsService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotSuggestionsService.class);

    static final List<String> SUGERENCIAS_EVERGREEN = List.of(
        "¿Cómo van mis ventas esta semana?",
        "¿Cuáles son mis productos más vendidos?",
        "¿Qué cliente me compra más un producto específico?",
        "Dame un resumen de mi negocio"
    );

    @Autowired private InventoryForecastService  inventoryForecastService;
    @Autowired private AiCopilotContextBuilder contextBuilder;

    /**
     * Preguntas sugeridas para el chat: primero las que reflejan un hallazgo real
     * del negocio (stock crítico, productos sin venta, pedidos pendientes), después
     * se completa con preguntas genéricas hasta un máximo de 4.
     * Nunca lanza — si los datos no están disponibles, cae a las genéricas.
     */
    public List<String> getSugerencias(Long empresaId) {
        List<String> chips = new ArrayList<>();
        try {
            int lentos = inventoryForecastService.productosLentosMovimiento(empresaId).size();
            if (lentos > 0) {
                chips.add(String.format("Tengo %d producto%s sin ventas en 60+ días, ¿cuáles son y qué hago?",
                    lentos, lentos == 1 ? "" : "s"));
            }

            int enRiesgo = inventoryForecastService.productosEnRiesgo(empresaId).size();
            if (enRiesgo > 0) {
                chips.add(String.format("Tengo %d producto%s con stock crítico, ¿cuáles son?",
                    enRiesgo, enRiesgo == 1 ? "" : "s"));
            }

            int pendientes = contextBuilder.countPedidosPendientes(empresaId);
            if (pendientes > 0) {
                chips.add(String.format("Tengo %d pedido%s pendiente%s de despachar, ¿cuáles priorizo?",
                    pendientes, pendientes == 1 ? "" : "s", pendientes == 1 ? "" : "s"));
            }
        } catch (DataAccessException e) {
            log.warn("[AI-Copilot] empresaId={} sugerencias dinámicas no disponibles: {}", empresaId, e.getMessage());
        }

        for (String s : SUGERENCIAS_EVERGREEN) {
            if (chips.size() >= 4) break;
            chips.add(s);
        }
        return chips;
    }
}
