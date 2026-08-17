package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
public class TelegramDatosQueryService {

    private static final Logger log = LoggerFactory.getLogger(TelegramDatosQueryService.class);

    @Autowired private JdbcTemplate                  jdbc;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramEmpresaContextService empresaContext;

    public void responderConDatos(TelegramVinculacion v, Function<Long, String> generador) {
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;
        try {
            bot.enviarMensaje(v.getChatId(), generador.apply(empresaId));
        } catch (Exception e) {
            log.error("[telegram-bot] error consultando datos empresa {} — {}", empresaId, e.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude consultar los datos en este momento. Intentá de nuevo en unos minutos.");
        }
    }

    public String mensajeInventario(Long empresaId) {
        Integer total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_producto_tb WHERE fk_id_empresa = ? AND fk_id_estado = 1",
            Integer.class, empresaId);
        Integer agotados = jdbc.queryForObject(
            "SELECT COUNT(*) FROM hot_click_producto_tb WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND stock_actual <= 0",
            Integer.class, empresaId);
        List<Map<String, Object>> bajos = jdbc.queryForList("""
            SELECT nombre_producto, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
              AND stock_actual > 0 AND stock_actual <= COALESCE(stock_minimo, 3)
            ORDER BY stock_actual ASC LIMIT 8
            """, empresaId);

        StringBuilder sb = new StringBuilder("📦 *Inventario*\n\n");
        sb.append("Productos activos: *").append(total).append("*\n");
        sb.append("Agotados: *").append(agotados).append("*\n");
        if (bajos.isEmpty()) {
            sb.append("\nNingún producto con stock bajo. Todo en orden ✅");
        } else {
            sb.append("\n⚠️ *Stock bajo:*\n");
            for (Map<String, Object> p : bajos) {
                sb.append("• ").append(esc(String.valueOf(p.get("nombre_producto"))))
                  .append(" — quedan *").append(p.get("stock_actual")).append("*\n");
            }
        }
        return sb.toString();
    }

    public String mensajeVentasHoy(Long empresaId) {
        LocalDateTime inicioDia = LocalDate.now(Constants.ZONA_CR).atStartOfDay();
        Map<String, Object> conf = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos, COALESCE(SUM(total_pedido),0) AS ingresos
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido IN ('PAGADO','ENTREGADO')
            """, empresaId, inicioDia);
        Integer pendientes = jdbc.queryForObject("""
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido = 'PENDIENTE'
            """, Integer.class, empresaId, inicioDia);

        return "💰 *Ventas de hoy*\n\n"
            + "Ventas confirmadas: *" + conf.get("pedidos") + "*\n"
            + "Ingresos: *" + colones(conf.get("ingresos")) + "*\n"
            + "Pedidos pendientes: *" + pendientes + "*";
    }

    public String mensajeFinanzasMes(Long empresaId) {
        LocalDateTime inicioMes = LocalDate.now(Constants.ZONA_CR).withDayOfMonth(1).atStartOfDay();
        Map<String, Object> mes = jdbc.queryForMap("""
            SELECT COUNT(*) AS pedidos,
                   COALESCE(SUM(total_pedido),0)              AS ingresos,
                   COALESCE(SUM(COALESCE(utilidad_bruta,0)),0) AS utilidad
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido IN ('PAGADO','ENTREGADO')
            """, empresaId, inicioMes);
        Integer entregados = jdbc.queryForObject("""
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND fecha_pedido >= ? AND estado_pedido = 'ENTREGADO'
            """, Integer.class, empresaId, inicioMes);

        long pedidos  = ((Number) mes.get("pedidos")).longValue();
        long ingresos = ((Number) mes.get("ingresos")).longValue();
        String ticket = pedidos > 0 ? colones(ingresos / pedidos) : "—";

        return "📊 *Finanzas del mes*\n\n"
            + "Ventas: *" + pedidos + "* (" + entregados + " entregadas)\n"
            + "Ingresos: *" + colones(ingresos) + "*\n"
            + "Utilidad bruta: *" + colones(mes.get("utilidad")) + "*\n"
            + "Ticket promedio: *" + ticket + "*";
    }

    public String nombreEmpresa(Long empresaId) {
        try {
            return jdbc.queryForObject(
                "SELECT COALESCE(nombre_comercial, nombre_empresa) FROM hot_click_empresa_tb WHERE id_empresa = ?",
                String.class, empresaId);
        } catch (Exception e) {
            return "Tu negocio";
        }
    }

    public String colones(Object monto) {
        long valor = monto instanceof Number n ? n.longValue() : 0;
        return String.format("₡%,d", valor);
    }

    /** Quita caracteres que rompen el Markdown de Telegram en valores dinámicos. */
    public String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }
}
