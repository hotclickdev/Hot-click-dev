package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P-04 ciclo 3: toda SQL nativa de métricas/ventas que filtra por estado_pedido también excluye es_prueba.
 * Las consultas usan funciones de Postgres (DATE_TRUNC, INTERVAL, FILTER) que H2 no ejecuta,
 * así que se fija el filtro sobre el texto de la consulta.
 */
@DisplayName("P-04 | es_prueba en SQL nativa de métricas")
class EsPruebaFiltroSqlTest {

    private static final Path SRC = Path.of("src/main/java/com/hotclick/service");
    private static final Pattern FILTRO_ESTADO =
        Pattern.compile("(AND|WHERE)\\s+(\\w+\\.)?estado_pedido\\s*(IN\\s*\\(|=\\s*')");

    /** Devuelve las líneas con filtro por estado que no excluyen es_prueba en esa línea o la siguiente. */
    private static List<String> sinFiltro(String archivo) throws IOException {
        List<String> lineas = Files.readAllLines(SRC.resolve(archivo));
        List<String> faltan = new ArrayList<>();
        for (int i = 0; i < lineas.size(); i++) {
            if (!FILTRO_ESTADO.matcher(lineas.get(i)).find()) continue;
            String sig = i + 1 < lineas.size() ? lineas.get(i + 1) : "";
            if (!(lineas.get(i) + sig).contains("es_prueba = false")) faltan.add(archivo + ":" + (i + 1));
        }
        return faltan;
    }

    private static void verificar(String... archivos) throws IOException {
        for (String a : archivos) {
            String fuente = Files.readString(SRC.resolve(a));
            assertThat(fuente).as(a).contains("es_prueba = false");
            assertThat(sinFiltro(a)).as(a).isEmpty();
        }
    }

    @Test
    void dashboardEjecutivo() throws IOException {
        verificar("ExecutiveDashboardService.java");
    }

    @Test
    void usoDelTenant() throws IOException {
        assertThat(Files.readString(SRC.resolve("tenant/TenantUsoService.java")))
            .contains("FROM hot_click_pedido_tb ped")
            .contains("WHERE ped.es_prueba = false");
    }

    @Test
    void copilotIa() throws IOException {
        verificar("copilot/AiCopilotVentasQueries.java", "copilot/AiCopilotReporteQueries.java",
            "copilot/AiCopilotPedidosQueries.java", "copilot/AiCopilotStockQueries.java",
            "copilot/AiCopilotClientesQueries.java", "copilot/AiCopilotProyeccionQueries.java");
    }

    @Test
    void botDeTelegram() throws IOException {
        verificar("telegram/TelegramDatosQueryService.java", "telegram/TelegramClienteDetalleBuilder.java");
    }

    @Test
    void consolaDePlataforma() throws IOException {
        verificar("consola/ConsolaFichaService.java", "consola/ConsolaMovimientoService.java");
    }

    @Test
    void pronosticosDeInventarioYDemanda() throws IOException {
        verificar("InventoryForecastService.java", "DemandForecastService.java");
    }

    @Test
    void elDetectorEncuentraUnaConsultaSinFiltro() throws IOException {
        Path tmp = Files.createTempFile("sql", ".java");
        Files.writeString(tmp, "  WHERE fk_id_empresa = ?\n  AND estado_pedido IN ('PAGADO')\n  GROUP BY 1\n");
        List<String> l = Files.readAllLines(tmp);
        boolean detecta = FILTRO_ESTADO.matcher(l.get(1)).find() && !(l.get(1) + l.get(2)).contains("es_prueba = false");
        assertThat(detecta).isTrue();
        Files.delete(tmp);
    }
}
