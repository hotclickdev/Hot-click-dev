package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Flujo de consulta de clientes y cross-sell del bot de Telegram.
 * Extraído bit-idéntico de TelegramFlujoService — {@code sugerirCrossSellAsync}
 * queda anotado en la fachada y delega acá el cuerpo.
 */
@Service
public class TelegramFlujoClientesHandler {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoClientesHandler.class);

    @Autowired private TelegramFlujoSupport          support;
    @Autowired @Lazy private TelegramFlujoService    flujo;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private UsuarioRepository             usuarioRepository;
    @Autowired private AiCopilotService              aiCopilotService;
    @Autowired private JdbcTemplate                  jdbc;

    public void callback(TelegramVinculacion v, Long empresaId, String sub) {
        // La lista expone PII (teléfonos) — mismo nivel de permiso que las escrituras.
        if (support.denegarSiNoGestiona(v, empresaId)) return;

        if (sub.startsWith("pg:")) {
            Integer pg = parseEntero(sub.substring(3), 0, 10_000);
            mostrarClientes(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("v:")) {
            Long clienteId = parseLong(sub.substring(2));
            mostrarDetalleCliente(v, empresaId, clienteId);
        } else if (sub.startsWith("ia:")) {
            Long clienteId = parseLong(sub.substring(3));
            if (clienteId == null || !support.clientePerteneceAEmpresa(clienteId, empresaId)) return;
            bot.enviarMensaje(v.getChatId(), "Analizando su historial… ✍️");
            bot.enviarAccionEscribiendo(v.getChatId());
            flujo.sugerirCrossSellAsync(v.getChatId(), empresaId, clienteId);
        }
    }

    private void mostrarClientes(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Usuario> todos = usuarioRepository.findClientesByEmpresa(empresaId);
        if (todos.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Todavía no tenés clientes registrados. Se crean al registrar una venta con cliente o desde el CRM del panel.");
            return;
        }
        int desde = Math.min(pagina * PAGINA, Math.max(0, todos.size() - 1));
        List<Usuario> visibles = todos.subList(desde, Math.min(desde + PAGINA, todos.size()));

        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        visibles.forEach(c -> teclado.add(List.of(
            TelegramClienteBotService.boton(recortar(support.nombreCompleto(c), 40), "cli:v:" + c.getId()))));
        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0)                       nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "cli:pg:" + (pagina - 1)));
        if (desde + PAGINA < todos.size())    nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "cli:pg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("📋 Menú", "menu")));

        bot.enviarMensaje(v.getChatId(), "👥 *Tus clientes* (" + todos.size() + ")\nTocá uno para ver su historial:", teclado);
    }

    private void mostrarDetalleCliente(TelegramVinculacion v, Long empresaId, Long clienteId) {
        if (clienteId == null || !support.clientePerteneceAEmpresa(clienteId, empresaId)) {
            bot.enviarMensaje(v.getChatId(), "Ese cliente no pertenece a tu negocio.");
            return;
        }
        Usuario c = usuarioRepository.findById(clienteId).orElse(null);
        if (c == null) return;

        Map<String, Object> stats = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_pedido), 0) AS total
            FROM hot_click_pedido_tb
            WHERE fk_id_usuario_final = ? AND fk_id_empresa = ?
              AND estado_pedido IN ('PAGADO','ENTREGADO','COMPLETADO')
            """, clienteId, empresaId);

        List<Map<String, Object>> compras = jdbc.queryForList("""
            SELECT pr.nombre_producto, SUM(pi.cantidad) AS unidades, MAX(p.fecha_pedido) AS ultima
            FROM hot_click_pedido_item_tb pi
            JOIN hot_click_pedido_tb p   ON pi.fk_id_pedido = p.id_pedido
            JOIN hot_click_producto_tb pr ON pi.fk_id_producto = pr.id_producto
            WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?
              AND p.estado_pedido IN ('PAGADO','ENTREGADO','COMPLETADO')
            GROUP BY pr.nombre_producto
            ORDER BY ultima DESC
            LIMIT 10
            """, clienteId, empresaId);

        StringBuilder sb = new StringBuilder("👤 *" + esc(support.nombreCompleto(c)) + "*\n");
        if (c.getTelefono() != null && !"00000000".equals(c.getTelefono())) {
            sb.append("📞 ").append(esc(c.getTelefono())).append("\n");
        }
        sb.append("\nCompras en tu negocio: *").append(stats.get("pedidos"))
          .append("* — Total: *").append(colones(stats.get("total"))).append("*\n");
        if (compras.isEmpty()) {
            sb.append("\nTodavía no tiene compras registradas.");
        } else {
            sb.append("\n*Qué te ha comprado:*\n");
            compras.forEach(f -> sb.append("• ").append(esc((String) f.get("nombre_producto")))
                .append(" × ").append(f.get("unidades")).append("\n"));
        }

        bot.enviarMensaje(v.getChatId(), sb.toString(), List.of(
            List.of(TelegramClienteBotService.boton("💡 Sugerir qué ofrecerle", "cli:ia:" + clienteId)),
            List.of(TelegramClienteBotService.boton("⬅️ Clientes", "cli:pg:0"),
                    TelegramClienteBotService.boton("📋 Menú", "menu"))));
    }

    /**
     * Cuerpo del cross-sell. Lo invoca {@code TelegramFlujoService.sugerirCrossSellAsync}
     * ya dentro del hilo {@code @Async} (el caller entra por el proxy).
     */
    public void ejecutarCrossSell(Long chatId, Long empresaId, Long clienteId) {
        try {
            String respuesta = aiCopilotService.crossSellCliente(empresaId, clienteId);
            if (respuesta != null) {
                bot.enviarMensaje(chatId, respuesta, null, false);
                return;
            }
            String fallback = crossSellFallback(empresaId, clienteId);
            if (fallback != null) {
                bot.enviarMensaje(chatId, "La IA no está disponible en este momento — según su historial, podrías ofrecerle:\n\n" + fallback);
            } else {
                bot.enviarMensaje(chatId, "La IA no está disponible y no encontré productos relacionados con su historial para sugerir.");
            }
        } catch (Exception e) {
            log.error("[telegram-flujo] fallo cross-sell chat {} cliente {} — {}", chatId, clienteId, e.getMessage());
            bot.enviarMensaje(chatId, "No pude generar sugerencias en este momento. Intentá de nuevo en unos minutos.");
        }
    }

    private String crossSellFallback(Long empresaId, Long clienteId) {
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT pr.nombre_producto, pr.precio_venta
            FROM hot_click_producto_tb pr
            WHERE pr.fk_id_empresa = ? AND pr.fk_id_estado = 1 AND pr.visible_catalogo = TRUE
              AND (pr.stock_actual - COALESCE(pr.stock_reservado, 0)) > 0
              AND pr.fk_id_categoria IN (
                  SELECT DISTINCT pr2.fk_id_categoria
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p    ON pi.fk_id_pedido = p.id_pedido
                  JOIN hot_click_producto_tb pr2 ON pi.fk_id_producto = pr2.id_producto
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
              AND pr.id_producto NOT IN (
                  SELECT pi.fk_id_producto
                  FROM hot_click_pedido_item_tb pi
                  JOIN hot_click_pedido_tb p ON pi.fk_id_pedido = p.id_pedido
                  WHERE p.fk_id_usuario_final = ? AND p.fk_id_empresa = ?)
            ORDER BY pr.id_producto DESC
            LIMIT 5
            """, empresaId, clienteId, empresaId, clienteId, empresaId);
        if (filas.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        filas.forEach(f -> sb.append("• ").append(esc((String) f.get("nombre_producto")))
            .append(" — ").append(colones(f.get("precio_venta"))).append("\n"));
        return sb.toString();
    }
}
