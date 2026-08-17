package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.hotclick.dto.TelegramFlujoEstado.FLUJO_ACCION;
import static com.hotclick.service.telegram.TelegramFlujoSupport.esc;

/**
 * Flujo de acción propuesta por la IA (propose → confirm → execute).
 * Extraído bit-idéntico de TelegramFlujoService — las TX van por el proxy {@code flujo}.
 */
@Service
public class TelegramFlujoAccionHandler {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoAccionHandler.class);

    @Autowired private TelegramFlujoSupport          support;
    @Autowired @Lazy private TelegramFlujoService    flujo;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private PedidoRepository              pedidoRepository;
    @Autowired private ObjectMapper                  objectMapper;
    @Autowired private JdbcTemplate                  jdbc;

    /**
     * Registra una acción propuesta por el chat de IA como el borrador pendiente del
     * chat (mismo slot único que venta/producto/ajuste) y la muestra con botones
     * Confirmar/Cancelar. Nunca la ejecuta — eso solo pasa si el usuario confirma.
     */
    public void proponerAccion(TelegramVinculacion v, AccionPropuestaTelegram accion) {
        TelegramFlujoEstado e = TelegramFlujoEstado.nuevaAccion(
            support.ahora(), accion.tipo(), accion.entidadId(), accion.params(), accion.resumen());
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), accion.resumen(), List.of(
            List.of(TelegramClienteBotService.boton("✅ Confirmar", "acn:ok"),
                    TelegramClienteBotService.boton("❌ Cancelar", "acn:no"))));
    }

    public void callback(TelegramVinculacion v, Long empresaId, String sub) {
        if ("no".equals(sub)) { support.cancelar(v); return; }
        if ("ok".equals(sub)) { confirmarAccion(v, empresaId); }
    }

    private void confirmarAccion(TelegramVinculacion v, Long empresaId) {
        Optional<TelegramFlujoEstado> opt = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (opt.isEmpty() || !FLUJO_ACCION.equals(opt.get().getF())) {
            bot.enviarMensaje(v.getChatId(), "Esa propuesta ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }
        TelegramFlujoEstado e = opt.get();
        if (e.vencido(support.ahora())) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Esa propuesta venció. Pedime de nuevo lo que necesitás.");
            return;
        }
        // Defensa en profundidad: re-validar permiso al confirmar, no solo al proponer
        // (el usuario pudo cambiar de rol o de empresa activa entre medio).
        if (support.denegarSiNoGestiona(v, empresaId)) return;

        try {
            switch (e.getAcc()) {
                case AccionPropuestaTelegram.PEDIDO_ESTADO   -> confirmarCambiarEstadoPedido(v, empresaId, e);
                case AccionPropuestaTelegram.PEDIDO_GUIA     -> confirmarAsignarGuia(v, empresaId, e);
                case AccionPropuestaTelegram.STOCK_AJUSTE    -> confirmarAjustarStock(v, empresaId, e);
                case AccionPropuestaTelegram.PRODUCTO_OFERTA -> confirmarAplicarOferta(v, empresaId, e);
                default -> {
                    support.limpiar(v);
                    bot.enviarMensaje(v.getChatId(), "No reconozco esa acción. Escribí /menu.");
                }
            }
        } catch (RecursoNoEncontradoException ex) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ya no encuentro ese registro — puede que haya cambiado. Pedime de nuevo lo que necesitás.");
        } catch (OptimisticLockingFailureException ex) {
            // El borrador NO se limpia — mismo patrón de resiliencia que confirmarProducto:
            // el usuario solo tiene que volver a tocar Confirmar para reintentar.
            bot.enviarMensaje(v.getChatId(), "El registro cambió justo ahora. Tocá *Confirmar* de nuevo para reintentar, o *Cancelar*.");
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo confirmando acción en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude aplicar el cambio: " + esc(ex.getMessage()) + "\nReintentá o tocá *Cancelar*.");
        }
    }

    private void confirmarCambiarEstadoPedido(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        Pedido pedido = pedidoRepository.findById(e.getEid())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        if (pedido.getEmpresa() == null || !empresaId.equals(pedido.getEmpresa().getId())) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese pedido ya no pertenece a este negocio.");
            return;
        }
        String nuevoEstado = (String) e.getPar().get("nuevoEstado");
        String nota = (String) e.getPar().get("nota");
        Pedido actualizado = flujo.cambiarEstadoPedidoTx(e.getEid(), nuevoEstado, nota);
        support.limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Pedido *" + esc(actualizado.getNumeroPedido())
            + "* actualizado a *" + nuevoEstado + "*.");
    }

    private void confirmarAsignarGuia(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        Pedido pedido = pedidoRepository.findById(e.getEid())
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        if (pedido.getEmpresa() == null || !empresaId.equals(pedido.getEmpresa().getId())) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese pedido ya no pertenece a este negocio.");
            return;
        }
        String numeroGuia = (String) e.getPar().get("numeroGuia");
        Pedido actualizado = flujo.asignarGuiaTx(e.getEid(), numeroGuia);
        support.limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Guía *" + esc(numeroGuia) + "* asignada al pedido *"
            + esc(actualizado.getNumeroPedido()) + "*. Se notificó al cliente por email.");
    }

    private void confirmarAjustarStock(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            e.getEid(), empresaId);
        if (filas.isEmpty()) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese producto ya no pertenece a este negocio.");
            return;
        }
        int cantidadReal = ((Number) e.getPar().get("cantidadReal")).intValue();
        flujo.ajustarStockTx(e.getEid(), cantidadReal, v.getUsuario().getCorreo());
        support.limpiar(v);
        bot.enviarMensaje(v.getChatId(), "✅ Stock de *" + esc(String.valueOf(filas.get(0).get("nombre_producto")))
            + "* ajustado a *" + cantidadReal + "* unidades.");
    }

    private void confirmarAplicarOferta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT nombre_producto FROM hot_click_producto_tb WHERE id_producto = ? AND fk_id_empresa = ?",
            e.getEid(), empresaId);
        if (filas.isEmpty()) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese producto ya no pertenece a este negocio.");
            return;
        }
        Map<String, Object> par = e.getPar();
        boolean enOferta = Boolean.TRUE.equals(par.get("enOferta"));
        Integer pct    = par.get("porcentajeDescuento") != null ? ((Number) par.get("porcentajeDescuento")).intValue() : null;
        Integer precio = par.get("precioOferta") != null ? ((Number) par.get("precioOferta")).intValue() : null;
        flujo.aplicarOfertaTx(e.getEid(), enOferta, pct, precio);
        support.limpiar(v);
        bot.enviarMensaje(v.getChatId(), enOferta
            ? "✅ Oferta aplicada a *" + esc(String.valueOf(filas.get(0).get("nombre_producto"))) + "*."
            : "✅ Oferta retirada de *" + esc(String.valueOf(filas.get(0).get("nombre_producto"))) + "*.");
    }
}
