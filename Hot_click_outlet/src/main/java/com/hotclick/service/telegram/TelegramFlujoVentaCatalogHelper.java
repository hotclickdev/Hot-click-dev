package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Catálogo y resumen de ítems del flujo de venta Telegram.
 * Extraído bit-idéntico de TelegramFlujoVentaHandler — no cambia comportamiento.
 */
@Component
class TelegramFlujoVentaCatalogHelper {

    @Autowired private TelegramFlujoSupport      support;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private JdbcTemplate              jdbc;

    void seleccionarProductoVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String idCrudo) {
        Long productoId = parseLong(idCrudo);
        Map<String, Object> prod = productoId != null ? productoVendible(productoId, empresaId) : null;
        if (prod == null) {
            bot.enviarMensaje(v.getChatId(), "Ese producto no está disponible.");
            mostrarPaginaProductos(v, empresaId, 0);
            return;
        }
        e.setPid(productoId);
        e.setP(P_VTA_CANTIDAD);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades de *" + esc((String) prod.get("nombre_producto"))
            + "*? (disponibles: " + prod.get("disp") + ")\n\nEscribí solo el número, o /cancelar.");
    }

    void mostrarPaginaProductos(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT id_producto, nombre_producto, precio_venta,
                   (stock_actual - COALESCE(stock_reservado, 0)) AS disp
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND vendido = FALSE
              AND (stock_actual - COALESCE(stock_reservado, 0)) > 0
            ORDER BY nombre_producto ASC
            LIMIT ? OFFSET ?
            """, empresaId, PAGINA + 1, pagina * PAGINA);

        if (filas.isEmpty() && pagina == 0) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "No tenés productos con stock disponible para vender.");
            return;
        }
        boolean hayMas = filas.size() > PAGINA;
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        filas.stream().limit(PAGINA).forEach(p -> teclado.add(List.of(TelegramClienteBotService.boton(
            recortar((String) p.get("nombre_producto"), 30) + " · " + colones(p.get("precio_venta")) + " · x" + p.get("disp"),
            "vta:p:" + p.get("id_producto")))));

        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0) nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "vta:pg:" + (pagina - 1)));
        if (hayMas)     nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "vta:pg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));

        bot.enviarMensaje(v.getChatId(), "¿Qué producto vendiste? (tocá uno)", teclado);
    }

    String resumenItems(TelegramFlujoEstado e, Long empresaId) {
        StringBuilder sb = new StringBuilder();
        int total = 0;
        for (TelegramFlujoEstado.ItemBorrador ib : e.getItemsSeguro()) {
            List<Map<String, Object>> fila = jdbc.queryForList(
                "SELECT nombre_producto, precio_venta FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
                ib.getPid(), empresaId);
            if (fila.isEmpty()) continue;
            int precio = ((Number) fila.get(0).get("precio_venta")).intValue();
            int sub = precio * ib.getC();
            total += sub;
            sb.append("• ").append(ib.getC()).append(" × ")
              .append(esc((String) fila.get(0).get("nombre_producto")))
              .append(" — ").append(colones(sub)).append("\n");
        }
        sb.append("\nTotal: *").append(colones(total)).append("*\n");
        return sb.toString();
    }

    Map<String, Object> productoVendible(Long productoId, Long empresaId) {
        if (productoId == null) return null;
        List<Map<String, Object>> filas = jdbc.queryForList("""
            SELECT nombre_producto, (stock_actual - COALESCE(stock_reservado, 0)) AS disp
            FROM hot_click_producto_tb
            WHERE id_producto = ? AND fk_id_empresa = ? AND fk_id_estado = 1 AND vendido = FALSE
            """, productoId, empresaId);
        if (filas.isEmpty() || ((Number) filas.get(0).get("disp")).intValue() <= 0) return null;
        return filas.get(0);
    }
}
