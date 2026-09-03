package com.hotclick.service;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.sse.StockCambioEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Map;

/**
 * Notificaciones proactivas por Telegram a los dueños/equipo de cada negocio.
 *
 * Destinatarios: todas las vinculaciones ACTIVAS de miembros activos de la
 * empresa (query con join a hot_click_miembro_empresa_tb — si el propietario
 * desactiva a un empleado, deja de recibir avisos automáticamente).
 *
 * Eventos:
 *  - Venta (tienda online o POS)         → hook en PedidoService / PosController / PosQrService
 *  - Stock bajo (cruza el mínimo) / agotado → StockCambioEvent post-commit
 *
 * Los avisos de stock se deduplican con RateLimiter (1 aviso por producto cada
 * 24h) para no bombardear al dueño en cada venta del mismo producto.
 * Todo es fail-safe: un fallo de Telegram jamás afecta la venta.
 */
@Service
public class TelegramNotificacionClienteService {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotificacionClienteService.class);

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private RateLimiter                   rateLimiter;
    @Autowired private JdbcTemplate                  jdbc;

    // ── Venta ─────────────────────────────────────────────────────────────────

    @Async
    public void notificarVenta(Long empresaId, String numeroPedido, Integer total,
                               String metodoPago, String cliente, String origen) {
        if (!bot.isConfigured() || empresaId == null) return;
        try {
            String titulo = "POS".equals(origen) ? "💵 *Venta en el punto de venta*" : "🛒 *Nueva venta en tu tienda*";
            String texto = titulo + "\n\n"
                + "Pedido: *" + esc(numeroPedido) + "*\n"
                + "Cliente: " + esc(cliente != null ? cliente : "Mostrador") + "\n"
                + "Total: *" + String.format("₡%,d", total != null ? total : 0) + "*\n"
                + "Pago: " + esc(metodoPago != null ? metodoPago : "—");
            enviarATodos(empresaId, texto);
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando venta {} — {}", numeroPedido, e.getMessage());
        }
    }

    // ── Aprobación de productos / promociones ──────────────────────────────────

    @Async
    public void notificarSolicitudEnviada(Long empresaId, String tipoLabel, String nombreItem) {
        if (!bot.isConfigured() || empresaId == null) return;
        try {
            String texto = "📝 *Solicitud enviada*\n\n"
                + tipoLabel + " *" + esc(nombreItem) + "* fue enviado a revisión. "
                + "Te avisamos apenas el equipo de HOTCLICK lo revise.";
            enviarATodos(empresaId, texto);
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando solicitud enviada {} — {}", nombreItem, e.getMessage());
        }
    }

    @Async
    public void notificarSolicitudAprobada(Long empresaId, String tipoLabel, String nombreItem) {
        if (!bot.isConfigured() || empresaId == null) return;
        try {
            String texto = "✅ *" + tipoLabel.replaceFirst("^Tu ", "") + " aprobado*\n\n"
                + "*" + esc(nombreItem) + "* ya está publicado.";
            enviarATodos(empresaId, texto);
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando aprobación {} — {}", nombreItem, e.getMessage());
        }
    }

    @Async
    public void notificarSolicitudRevision(Long empresaId, String tipoLabel, String nombreItem, String comentario) {
        if (!bot.isConfigured() || empresaId == null) return;
        try {
            String texto = "🔧 *Se necesitan ajustes*\n\n"
                + tipoLabel + " *" + esc(nombreItem) + "* necesita algunos cambios antes de publicarse.\n\n"
                + (comentario != null && !comentario.isBlank() ? esc(comentario) + "\n\n" : "")
                + "Si tenés dudas, escribinos al *8666-7888*.";
            enviarATodos(empresaId, texto);
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando revisión {} — {}", nombreItem, e.getMessage());
        }
    }

    @Async
    public void notificarProductoModerado(Long empresaId, String nombreProducto, boolean pausado, String notas) {
        if (!bot.isConfigured() || empresaId == null) return;
        try {
            StringBuilder texto = new StringBuilder();
            if (pausado) {
                texto.append("⏸ *Producto pausado*\n\n")
                    .append("*").append(esc(nombreProducto)).append("* quedó oculto del catálogo.");
            } else {
                texto.append("👁 *Aviso sobre tu producto*\n\n")
                    .append("*").append(esc(nombreProducto)).append("*");
            }
            if (notas != null && !notas.isBlank()) {
                texto.append("\n\n").append(esc(notas));
            }
            texto.append("\n\nPausado no es rechazo del negocio. Revisá el producto en tu panel.");
            enviarATodos(empresaId, texto.toString());
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando producto moderado {} — {}", nombreProducto, e.getMessage());
        }
    }

    // ── Stock bajo / agotado (post-commit del cambio de stock) ────────────────

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStockCambio(StockCambioEvent evento) {
        if (!bot.isConfigured() || evento.getEmpresaId() == null) return;
        try {
            int stock = evento.getStockActual() != null ? evento.getStockActual() : 0;

            if (stock <= 0) {
                // 1 aviso de agotado por producto cada 24h
                if (!rateLimiter.tryAcquire("tg:agotado:" + evento.getProductoId(), 1, 86_400)) return;
                String nombre = nombreProducto(evento.getProductoId());
                if (nombre == null) return;
                enviarATodos(evento.getEmpresaId(),
                    "🚫 *Producto agotado*\n\n*" + esc(nombre) + "* se quedó sin unidades y ya no aparece en el catálogo. Reponelo para seguir vendiendo.");
                return;
            }

            Integer minimo = stockMinimo(evento.getProductoId());
            if (minimo == null || stock > minimo) return;
            if (!rateLimiter.tryAcquire("tg:stockbajo:" + evento.getProductoId(), 1, 86_400)) return;

            String nombre = nombreProducto(evento.getProductoId());
            if (nombre == null) return;
            enviarATodos(evento.getEmpresaId(),
                "⚠️ *Stock bajo*\n\nDe *" + esc(nombre) + "* quedan *" + stock + "* unidades (mínimo: " + minimo + ").");
        } catch (Exception e) {
            log.error("[telegram-notif] fallo notificando stock producto {} — {}", evento.getProductoId(), e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void enviarATodos(Long empresaId, String texto) {
        List<TelegramVinculacion> destinos = vinculacionRepository.findActivasPorEmpresa(empresaId);
        for (TelegramVinculacion v : destinos) {
            bot.enviarMensaje(v.getChatId(), texto);
        }
    }

    private String nombreProducto(Long productoId) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ?", productoId);
        return filas.isEmpty() ? null : String.valueOf(filas.get(0).get("nombre_producto"));
    }

    private Integer stockMinimo(Long productoId) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT COALESCE(stock_minimo, 3) AS minimo FROM hot_click_producto_tb WHERE id_producto = ?", productoId);
        return filas.isEmpty() ? null : ((Number) filas.get(0).get("minimo")).intValue();
    }

    private String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }
}
