package com.hotclick.scheduler;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Chequeo semanal de inventario por Telegram — lunes 9:00 AM hora de Costa Rica.
 *
 * A cada usuario vinculado (con empresa activa) le manda la lista de productos
 * a confirmar con botones:
 *   - "Todo correcto"  → no toca nada
 *   - "Ajustar <producto>" → el bot pide la cantidad real y fija el stock
 *     (solo PROPIETARIO/ADMIN; el ajuste queda auditado en movimiento_stock)
 *
 * Selección de productos: si el negocio tiene ≤10 activos van todos; si tiene
 * más, prioriza los de stock bajo y luego los de menos existencias (máx 10).
 *
 * ShedLock: en multi-instancia solo un pod ejecuta el envío.
 */
@Component
public class TelegramInventarioScheduler {

    private static final Logger log = LoggerFactory.getLogger(TelegramInventarioScheduler.class);
    private static final int MAX_PRODUCTOS = 10;

    private final TelegramVinculacionRepository vinculacionRepository;
    private final TelegramClienteBotService     bot;
    private final JdbcTemplate                  jdbc;

    public TelegramInventarioScheduler(TelegramVinculacionRepository vinculacionRepository,
                                       TelegramClienteBotService bot,
                                       JdbcTemplate jdbc) {
        this.vinculacionRepository = vinculacionRepository;
        this.bot                   = bot;
        this.jdbc                  = jdbc;
    }

    @Scheduled(cron = "0 0 9 * * MON", zone = "America/Costa_Rica")
    @SchedulerLock(name = "telegram_chequeo_inventario", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
    public void enviarChequeoSemanal() {
        if (!bot.isConfigured()) return;
        long inicio = System.currentTimeMillis();
        int enviados = 0;

        for (TelegramVinculacion v : vinculacionRepository.findByEstadoAndChatIdIsNotNull(TelegramVinculacion.ACTIVA)) {
            try {
                if (v.getEmpresaActivaId() == null) continue;
                if (enviarChequeoA(v)) enviados++;
            } catch (Exception e) {
                log.error("[telegram-chequeo] fallo con chat {} — {}", v.getChatId(), e.getMessage());
            }
        }
        log.info("[telegram-chequeo] {} chequeos enviados en {} ms", enviados, System.currentTimeMillis() - inicio);
    }

    /** Visible para tests. Retorna true si se envió (la empresa tenía productos). */
    public boolean enviarChequeoA(TelegramVinculacion v) {
        List<Map<String, Object>> productos = productosAConfirmar(v.getEmpresaActivaId());
        if (productos.isEmpty()) return false;

        StringBuilder sb = new StringBuilder("📋 *Chequeo semanal de inventario*\n\nSegún el sistema tenés:\n");
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        teclado.add(List.of(TelegramClienteBotService.boton("✅ Todo correcto", "chkok")));

        for (Map<String, Object> p : productos) {
            String nombre = String.valueOf(p.get("nombre_producto"));
            sb.append("• ").append(esc(nombre)).append(" — *").append(p.get("stock_actual")).append("*\n");
            String etiqueta = "✏️ " + (nombre.length() > 28 ? nombre.substring(0, 28) + "…" : nombre);
            teclado.add(List.of(TelegramClienteBotService.boton(etiqueta, "chk:" + p.get("id_producto"))));
        }
        sb.append("\n¿Coincide con lo que tenés físicamente? Si algo no calza, tocá el producto y escribí la cantidad real.");

        bot.enviarMensaje(v.getChatId(), sb.toString(), teclado);
        return true;
    }

    private List<Map<String, Object>> productosAConfirmar(Long empresaId) {
        // Prioriza stock bajo, luego menor existencia; con pocos productos entra todo
        return jdbc.queryForList("""
            SELECT id_producto, nombre_producto, stock_actual
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1
            ORDER BY CASE WHEN stock_actual <= COALESCE(stock_minimo, 3) THEN 0 ELSE 1 END,
                     stock_actual ASC, id_producto ASC
            LIMIT ?
            """, empresaId, MAX_PRODUCTOS);
    }

    private String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }
}
