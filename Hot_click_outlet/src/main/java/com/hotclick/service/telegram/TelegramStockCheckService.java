package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TelegramStockCheckService {

    private static final Logger log = LoggerFactory.getLogger(TelegramStockCheckService.class);

    public static final String CTX_AJUSTE = "AJUSTE:";

    @Autowired private JdbcTemplate                  jdbc;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private StockService                  stockService;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramDatosQueryService     datosQuery;

    public void iniciarAjuste(TelegramVinculacion v, String idCrudo) {
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;
        long productoId;
        try {
            productoId = Long.parseLong(idCrudo);
        } catch (NumberFormatException e) {
            return;
        }
        if (!puedeAjustarStock(v, empresaId)) {
            bot.enviarMensaje(v.getChatId(), "Solo el propietario o un administrador del negocio puede ajustar el inventario.");
            return;
        }
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto, stock_actual FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            productoId, empresaId);
        if (filas.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Ese producto no pertenece a tu negocio activo.");
            return;
        }
        v.setContexto(CTX_AJUSTE + productoId);
        vinculacionRepository.save(v);
        bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades de *" + datosQuery.esc(String.valueOf(filas.get(0).get("nombre_producto")))
            + "* tenés realmente? (el sistema dice " + filas.get(0).get("stock_actual")
            + ")\n\nEscribí solo el número, o /cancelar para salir.");
    }

    public void procesarAjusteCantidad(TelegramVinculacion v, String texto) {
        int cantidad;
        try {
            cantidad = Integer.parseInt(texto.trim());
        } catch (NumberFormatException e) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 4). Escribilo de nuevo o /cancelar para salir.");
            return;
        }
        if (cantidad < 0 || cantidad > 1_000_000) {
            bot.enviarMensaje(v.getChatId(), "La cantidad debe estar entre 0 y 1 000 000.");
            return;
        }

        long productoId = Long.parseLong(v.getContexto().substring(CTX_AJUSTE.length()));
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;

        // Defensa en profundidad: revalidar tenencia y permiso aunque ya se validó al iniciar
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            productoId, empresaId);
        if (filas.isEmpty() || !puedeAjustarStock(v, empresaId)) {
            v.setContexto(null);
            vinculacionRepository.save(v);
            bot.enviarMensaje(v.getChatId(), "No se pudo aplicar el ajuste.");
            return;
        }

        try {
            stockService.ajustarAExistencia(productoId, cantidad, "telegram-chequeo", v.getUsuario().getCorreo());
            v.setContexto(null);
            vinculacionRepository.save(v);
            bot.enviarMensaje(v.getChatId(), "Listo ✅ *" + datosQuery.esc(String.valueOf(filas.get(0).get("nombre_producto")))
                + "* ahora tiene *" + cantidad + "* unidades registradas.");
        } catch (Exception e) {
            log.error("[telegram-bot] fallo ajuste producto {} — {}", productoId, e.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude aplicar el ajuste. Intentá de nuevo en unos minutos.");
        }
    }

    public boolean puedeAjustarStock(TelegramVinculacion v, Long empresaId) {
        return miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(v.getUsuario().getId(), empresaId, 1)
            .map(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()) || "ADMIN".equals(m.getRolEnEmpresa()))
            .orElse(false);
    }
}
