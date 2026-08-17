package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.service.FinanzasReporteService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

/**
 * Consultas de finanzas del Copilot admin.
 * Extraído bit-idéntico de AiCopilotDataQueries — no cambia comportamiento.
 */
@Component
class AiCopilotFinanzasQueries {

    @Autowired private FinanzasReporteService finanzasReporteService;

    String getFinanzasData(Long empresaId, JsonNode args) {
        String periodo = args != null && args.hasNonNull("periodo") ? args.get("periodo").asText() : "mes";
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        String desde = switch (periodo) {
            case "hoy"    -> hoy.toString();
            case "semana" -> hoy.minusDays(7).toString();
            case "todo"   -> null;
            default       -> hoy.withDayOfMonth(1).toString(); // "mes"
        };

        Map<String, Object> kpis = finanzasReporteService.calcularKpis(empresaId, desde, null);
        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        return """
            Período: %s
            Ventas: %s / ₡%s
            Costo de mercadería vendida (CMV): ₡%s
            Costo de envío: ₡%s
            Ganancia neta: ₡%s (margen %s%%)
            IVA recaudado: ₡%s | IVA estimado: ₡%s
            Compras a proveedor recibidas en el período: ₡%s
            """.formatted(periodo, kpis.get("cantidadVentas"), fmt.format(kpis.get("ventasTotales")),
                fmt.format(kpis.get("cmv")), fmt.format(kpis.get("costoEnvio")),
                fmt.format(kpis.get("gananciaNeta")), kpis.get("margenPct"),
                fmt.format(kpis.get("ivaRecaudado")), fmt.format(kpis.get("ivaEstimado")),
                fmt.format(kpis.get("comprasRecibidas")));
    }
}
