package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Detalle de cliente para el flujo de Telegram — extraído bit-idéntico de {@link TelegramFlujoClientesHandler}.
 */
@Component
class TelegramClienteDetalleBuilder {

    @Autowired private TelegramFlujoSupport      support;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private UsuarioRepository         usuarioRepository;
    @Autowired private JdbcTemplate              jdbc;

    void mostrarDetalle(TelegramVinculacion v, Long empresaId, Long clienteId) {
        if (clienteId == null || !support.clientePerteneceAEmpresa(clienteId, empresaId)) {
            bot.enviarMensaje(v.getChatId(), "Ese cliente no pertenece a tu negocio.");
            return;
        }
        Usuario c = usuarioRepository.findById(clienteId).orElse(null);
        if (c == null) return;

        Map<String, Object> stats = consultarStats(clienteId, empresaId);
        List<Map<String, Object>> compras = consultarCompras(clienteId, empresaId);
        String mensaje = armarMensaje(c, stats, compras);

        bot.enviarMensaje(v.getChatId(), mensaje, List.of(
            List.of(TelegramClienteBotService.boton("💡 Sugerir qué ofrecerle", "cli:ia:" + clienteId)),
            List.of(TelegramClienteBotService.boton("⬅️ Clientes", "cli:pg:0"),
                    TelegramClienteBotService.boton("📋 Menú", "menu"))));
    }

    private Map<String, Object> consultarStats(Long clienteId, Long empresaId) {
        return jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_pedido), 0) AS total
            FROM hot_click_pedido_tb
            WHERE fk_id_usuario_final = ? AND fk_id_empresa = ?
              AND estado_pedido IN ('PAGADO','ENTREGADO','COMPLETADO')
            """, clienteId, empresaId);
    }

    private List<Map<String, Object>> consultarCompras(Long clienteId, Long empresaId) {
        return jdbc.queryForList("""
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
    }

    private String armarMensaje(Usuario c, Map<String, Object> stats, List<Map<String, Object>> compras) {
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
        return sb.toString();
    }
}
