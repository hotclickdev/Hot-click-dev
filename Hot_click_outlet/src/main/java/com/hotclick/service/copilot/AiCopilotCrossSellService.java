package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sugerencia de cross-sell para un cliente puntual (bot de Telegram).
 * Extraído bit-idéntico de AiCopilotService — no cambia comportamiento.
 */
@Service
public class AiCopilotCrossSellService {

    private static final Logger log = LoggerFactory.getLogger(AiCopilotCrossSellService.class);
    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";
    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${anthropic.api-key:}")
    private String claudeApiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String claudeModel;

    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbc;

    private boolean isClaudeEnabled() {
        return claudeApiKey != null && !claudeApiKey.isBlank();
    }

    /**
     * Sugerencia de cross-sell para un cliente puntual — la usa el flujo de
     * "Clientes" del bot de Telegram (TelegramFlujoService.sugerirCrossSellAsync)
     * para redactar 2-3 productos que ofrecerle según lo que ya compró.
     *
     * Es una llamada puntual, no una conversación: no consume el historial de
     * hot_click_ai_mensaje_tb ni escribe en él. Retorna {@code null} si la IA
     * no está disponible o no hay suficiente historial/candidatos para sugerir —
     * el caller cae a su propio fallback SQL.
     */
    public String crossSellCliente(Long empresaId, Long clienteId) {
        if (!isClaudeEnabled()) return null;

        List<String> nombreRows = jdbc.queryForList(
            "SELECT nombre FROM hot_click_usuario_tb WHERE id_usuario = ?", String.class, clienteId);
        String nombreCliente = nombreRows.isEmpty() ? "el cliente" : nombreRows.get(0);

        List<String> comprados = jdbc.queryForList("""
            SELECT DISTINCT p.nombre_producto
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb ped ON pi.fk_id_pedido = ped.id_pedido
            JOIN hot_click_producto_tb p ON pi.fk_id_producto = p.id_producto
            WHERE ped.fk_id_usuario_final = ? AND ped.fk_id_empresa = ?
            ORDER BY p.nombre_producto LIMIT 15
            """, String.class, clienteId, empresaId);
        if (comprados.isEmpty()) return null; // sin historial, no hay base para sugerir

        var candidatos = jdbc.queryForList("""
            SELECT pr.nombre_producto, pr.precio_venta
            FROM hot_click_producto_tb pr
            WHERE pr.fk_id_empresa = ? AND pr.fk_id_estado = 1 AND pr.visible_catalogo = TRUE
              AND (pr.stock_actual - COALESCE(pr.stock_reservado, 0)) > 0
              AND pr.fk_id_categoria IN (
                  SELECT DISTINCT pr2.fk_id_categoria
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  JOIN hot_click_producto_tb pr2 ON pi.fk_id_producto = pr2.id_producto
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
              AND pr.id_producto NOT IN (
                  SELECT pi.fk_id_producto
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
            ORDER BY pr.id_producto DESC
            LIMIT 10
            """, empresaId, clienteId, empresaId, clienteId, empresaId);
        if (candidatos.isEmpty()) return null;

        java.text.DecimalFormat fmt = new java.text.DecimalFormat("#,###");
        StringBuilder datos = new StringBuilder();
        datos.append("Cliente: ").append(nombreCliente).append("\n");
        datos.append("Ya compró: ").append(String.join(", ", comprados)).append("\n\n");
        datos.append("Productos disponibles que aún no compró (mismas categorías de interés):\n");
        candidatos.forEach(p -> datos.append(String.format("  - %s — ₡%s%n",
            p.get("nombre_producto"), fmt.format(p.get("precio_venta")))));

        String systemPrompt = """
            Sos el Copilot de HOTCLICK. Vas a redactar una sugerencia breve de cross-sell
            para que el dueño del negocio se la envíe a un cliente puntual por WhatsApp.
            Tono costarricense, cercano, natural — nunca corporativo. Elegí 2 o 3 productos
            como máximo de la lista de candidatos, explicá brevemente por qué le podrían
            interesar según lo que ya compró. Máximo 80 palabras. No inventés productos
            fuera de la lista.

            %s
            """.formatted(datos);

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", claudeModel);
            body.put("max_tokens", 300);
            body.put("system", systemPrompt);
            body.put("messages", List.of(Map.of("role", "user", "content", "Generá la sugerencia.")));

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(CLAUDE_URL))
                .timeout(Duration.ofSeconds(25))
                .header("Content-Type", "application/json")
                .header("x-api-key", claudeApiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("[AI-crosssell] empresaId={} clienteId={} Claude respondió {}", empresaId, clienteId, response.statusCode());
                return null;
            }
            JsonNode node = objectMapper.readTree(response.body());
            StringBuilder textoSb = new StringBuilder();
            for (JsonNode block : node.path("content")) {
                if ("text".equals(block.path("type").asText())) textoSb.append(block.path("text").asText(""));
            }
            String texto = textoSb.toString().trim();
            return texto.isBlank() ? null : texto;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.error("[AI-crosssell] empresaId={} clienteId={} fallo llamando a Claude — {}", empresaId, clienteId, e.getMessage());
            return null;
        }
    }
}
