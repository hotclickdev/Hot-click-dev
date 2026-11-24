package com.hotclick.agente.interno;

import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.exception.PedidoYaCanceladoException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.TelegramFlujoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Ejecuta una acción ya confirmada del modo interno reutilizando las MISMAS transacciones del bot de Telegram
 * ({@code TelegramFlujoService.*Tx}, que delegan en PedidoService/StockService/ProductoService). Solo repite la
 * guarda de pertenencia al negocio, que en Telegram vive mezclada con el envío de mensajes. Las propuestas las
 * arma {@code AiCopilotToolExecutor} (misma validación que Telegram).
 */
@Service
public class AccionPropuestaEjecutor {

    private static final Logger log = LoggerFactory.getLogger(AccionPropuestaEjecutor.class);

    /** @param aplicada true si el cambio se hizo; mensaje: texto plano para el usuario */
    public record Resultado(boolean aplicada, String mensaje) {}

    private final TelegramFlujoService flujo;
    private final PedidoRepository pedidos;
    private final JdbcTemplate jdbc;

    public AccionPropuestaEjecutor(@Lazy TelegramFlujoService flujo, PedidoRepository pedidos, JdbcTemplate jdbc) {
        this.flujo = flujo;
        this.pedidos = pedidos;
        this.jdbc = jdbc;
    }

    public Resultado ejecutar(AccionPropuestaTelegram a, Long empresaId, String operadorCorreo) {
        try {
            return switch (a.tipo()) {
                case AccionPropuestaTelegram.PEDIDO_ESTADO -> cambiarEstado(a, empresaId);
                case AccionPropuestaTelegram.PEDIDO_GUIA -> asignarGuia(a, empresaId);
                case AccionPropuestaTelegram.STOCK_AJUSTE -> ajustarStock(a, empresaId, operadorCorreo);
                case AccionPropuestaTelegram.PRODUCTO_OFERTA -> aplicarOferta(a, empresaId);
                default -> new Resultado(false, "No reconozco esa acción.");
            };
        } catch (PedidoYaCanceladoException e) {
            return new Resultado(false, PedidoYaCanceladoException.MENSAJE);
        } catch (RecursoNoEncontradoException e) {
            return new Resultado(false, "Ya no encuentro ese registro; puede que haya cambiado. Pedime de nuevo lo que necesitás.");
        } catch (OptimisticLockingFailureException e) {
            return new Resultado(false, "El registro cambió justo ahora. Pedime la acción de nuevo.");
        } catch (RuntimeException e) {
            // Sin mensaje de la excepción: puede traer datos del negocio.
            log.error("[agente-interno] fallo ejecutando acción {} en empresa {}: {}", a.tipo(), empresaId,
                e.getClass().getSimpleName());
            return new Resultado(false, "No pude aplicar el cambio. Reintentá en unos minutos.");
        }
    }

    private Resultado cambiarEstado(AccionPropuestaTelegram a, Long empresaId) {
        Pedido p = pedidoDeLaEmpresa(a.entidadId(), empresaId);
        if (p == null) return new Resultado(false, "Ese pedido ya no pertenece a este negocio.");
        String nuevo = (String) a.params().get("nuevoEstado");
        String nota = (String) a.params().get("nota");
        Pedido act = flujo.cambiarEstadoPedidoTx(a.entidadId(), nuevo, nota);
        return new Resultado(true, "Pedido " + act.getNumeroPedido() + " actualizado a " + nuevo + ".");
    }

    private Resultado asignarGuia(AccionPropuestaTelegram a, Long empresaId) {
        Pedido p = pedidoDeLaEmpresa(a.entidadId(), empresaId);
        if (p == null) return new Resultado(false, "Ese pedido ya no pertenece a este negocio.");
        String guia = (String) a.params().get("numeroGuia");
        Pedido act = flujo.asignarGuiaTx(a.entidadId(), guia);
        return new Resultado(true, "Guía " + guia + " asignada al pedido " + act.getNumeroPedido()
            + ". Se notificó al cliente por email.");
    }

    private Resultado ajustarStock(AccionPropuestaTelegram a, Long empresaId, String correo) {
        String nombre = nombreProducto(a.entidadId(), empresaId);
        if (nombre == null) return new Resultado(false, "Ese producto ya no pertenece a este negocio.");
        int cantidad = ((Number) a.params().get("cantidadReal")).intValue();
        flujo.ajustarStockTx(a.entidadId(), cantidad, "whatsapp-ia", correo);
        return new Resultado(true, "Stock de " + nombre + " ajustado a " + cantidad + " unidades.");
    }

    private Resultado aplicarOferta(AccionPropuestaTelegram a, Long empresaId) {
        String nombre = nombreProducto(a.entidadId(), empresaId);
        if (nombre == null) return new Resultado(false, "Ese producto ya no pertenece a este negocio.");
        Map<String, Object> par = a.params();
        boolean enOferta = Boolean.TRUE.equals(par.get("enOferta"));
        Integer pct = par.get("porcentajeDescuento") != null ? ((Number) par.get("porcentajeDescuento")).intValue() : null;
        Integer precio = par.get("precioOferta") != null ? ((Number) par.get("precioOferta")).intValue() : null;
        flujo.aplicarOfertaTx(a.entidadId(), enOferta, pct, precio);
        return new Resultado(true, enOferta ? "Oferta aplicada a " + nombre + "." : "Oferta retirada de " + nombre + ".");
    }

    private Pedido pedidoDeLaEmpresa(Long pedidoId, Long empresaId) {
        Pedido p = pedidos.findById(pedidoId).orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        return p.getEmpresa() != null && empresaId.equals(p.getEmpresa().getId()) ? p : null;
    }

    private String nombreProducto(Long productoId, Long empresaId) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            productoId, empresaId);
        return filas.isEmpty() ? null : String.valueOf(filas.get(0).get("nombre_producto"));
    }
}
