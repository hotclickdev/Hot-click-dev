package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Resumen y confirmación del flujo de venta Telegram.
 * Extraído bit-idéntico de TelegramFlujoVentaHandler — no cambia comportamiento.
 */
@Component
class TelegramFlujoVentaConfirmHelper {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoVentaConfirmHelper.class);

    @Autowired private TelegramFlujoSupport           support;
    @Autowired @Lazy private TelegramFlujoService     flujo;
    @Autowired private TelegramClienteBotService      bot;
    @Autowired private UsuarioRepository              usuarioRepository;
    @Autowired private TelegramFlujoVentaCatalogHelper catalog;

    void mostrarResumenVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        e.setP(P_VTA_CONFIRMAR);
        support.guardar(v, e);
        StringBuilder sb = new StringBuilder("🧾 *Confirmá la venta:*\n\n");
        sb.append(catalog.resumenItems(e, empresaId));
        sb.append("\nPago: *").append(e.getPago() != null ? e.getPago() : "—").append("*\n");
        if (e.getCli() != null) {
            usuarioRepository.findById(e.getCli())
                .ifPresent(c -> sb.append("Cliente: *").append(esc(support.nombreCompleto(c))).append("*\n"));
        } else {
            sb.append("Cliente: sin asociar\n");
        }
        bot.enviarMensaje(v.getChatId(), sb.toString(), List.of(
            List.of(TelegramClienteBotService.boton("✅ Confirmar venta", "vta:ok")),
            List.of(TelegramClienteBotService.boton("➕ Agregar otro producto", "vta:add"),
                    TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    void confirmarVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        if (support.denegarSiNoGestiona(v, empresaId)) return;
        if (e.getItemsSeguro().isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "La venta no tiene productos. Escribí /menu para empezar de nuevo.");
            support.limpiar(v);
            return;
        }

        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setMetodoPago(e.getPago() != null ? e.getPago() : "EFECTIVO");
        dto.setClienteId(e.getCli());
        // PAGADO y no COMPLETADO: las vistas del bot y las finanzas filtran IN ('PAGADO','ENTREGADO')
        dto.setEstadoInicial(Constants.PEDIDO_PAGADO);
        dto.setNotas("Venta registrada por Telegram");
        List<VentaRequestDTO.ItemVentaDTO> items = new ArrayList<>();
        for (TelegramFlujoEstado.ItemBorrador ib : e.getItemsSeguro()) {
            VentaRequestDTO.ItemVentaDTO item = new VentaRequestDTO.ItemVentaDTO();
            item.setProductoId(ib.getPid());
            item.setCantidad(ib.getC());
            items.add(item);
        }
        dto.setItems(items);

        try {
            // REQUIRES_NEW via self-proxy: si la venta falla (p.ej. stock), solo se
            // revierte su transacción — la del webhook sigue viva para guardar el
            // borrador intacto y responder al usuario.
            Pedido pedido = flujo.crearVentaTx(dto, v.getUsuario().getCorreo(), empresaId);
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "✅ Venta *" + esc(pedido.getNumeroPedido()) + "* registrada.\n\n"
                + "Total: *" + colones(pedido.getTotalPedido()) + "*\n"
                + "Utilidad: *" + colones(pedido.getUtilidadBruta()) + "*\n\n"
                + "Ya aparece en 💰 Ventas de hoy y en Finanzas.",
                List.of(List.of(TelegramClienteBotService.boton("📋 Menú", "menu"))));
        } catch (StockInsuficienteException ex) {
            bot.enviarMensaje(v.getChatId(), "⚠️ " + esc(ex.getMessage())
                + "\n\nEl stock cambió desde que armaste la venta. Ajustá las cantidades:", List.of(
                List.of(TelegramClienteBotService.boton("➕ Elegir productos", "vta:add"),
                        TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo confirmando venta en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude registrar la venta: " + esc(ex.getMessage())
                + "\nProbá de nuevo en unos minutos o registrala desde el panel.");
        }
    }
}
