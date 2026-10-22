package com.hotclick.service.telegram;

import com.hotclick.model.OrigenPedido;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.exception.VentaMetodoRequierePasarelaException;
import com.hotclick.service.VentaService;
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
    @Autowired private TelegramAbusoService           abuso;

    /** Deja el borrador en el paso de pago, sin pago fijado, y repite el aviso con el teclado de efectivo. */
    private void volverAlPago(TelegramVinculacion v, TelegramFlujoEstado e) {
        String texto = e.getPago() == null
            ? TelegramFlujoVentaCallbackHelper.MSG_PAGO_SOLO_EFECTIVO
            : TelegramFlujoVentaCallbackHelper.MSG_PAGO_NO_PERMITIDO;
        e.setPago(null);
        e.setP(P_VTA_PAGO);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), texto, List.of(
            List.of(TelegramClienteBotService.boton("Efectivo", "vta:pay:EFECTIVO"),
                    TelegramClienteBotService.boton("Cancelar", BTN_CANCELAR))));
    }

    void mostrarResumenVenta(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        if (VentaService.METODOS_VENTA_RESTRINGIDOS && !"EFECTIVO".equals(e.getPago())) {
            volverAlPago(v, e);
            return;
        }
        e.setP(P_VTA_CONFIRMAR);
        support.guardar(v, e);
        StringBuilder sb = new StringBuilder("🧾 *Confirmá la venta:*\n\n");
        sb.append(catalog.resumenItems(e, empresaId));
        sb.append("\nPago: *").append(VentaService.METODOS_VENTA_RESTRINGIDOS ? "Efectivo" : (e.getPago() != null ? e.getPago() : "—")).append("*\n");
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

        boolean soloEfectivo = VentaService.METODOS_VENTA_RESTRINGIDOS;
        if (soloEfectivo && !"EFECTIVO".equals(e.getPago())) {
            // Sin efectivo elegido (borrador viejo, doble toque o botón de otra venta): vuelve al paso de pago sin crear nada
            volverAlPago(v, e);
            return;
        }

        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setMetodoPago(soloEfectivo || e.getPago() == null ? "EFECTIVO" : e.getPago());
        dto.setClienteId(e.getCli());
        // El bot no manda tipo de entrega: es retiro, y el efectivo con retiro nace cerrado (ENTREGADO).
        // Las vistas del bot y las finanzas filtran IN ('PAGADO','ENTREGADO')
        dto.setEstadoInicial(soloEfectivo ? Constants.PEDIDO_ENTREGADO : Constants.PEDIDO_PAGADO);
        dto.setNotas("Venta registrada por Telegram");
        // El negocio registra la venta por el bot: es manual, no una compra web (chk_pedido_origen)
        dto.setOrigen(OrigenPedido.MANUAL.codigo());
        List<VentaRequestDTO.ItemVentaDTO> items = new ArrayList<>();
        TelegramFlujoVentaTextoHelper.cantidadesIndicadas(e.getItemsSeguro()).forEach((pid, cant) -> {
            VentaRequestDTO.ItemVentaDTO item = new VentaRequestDTO.ItemVentaDTO();
            item.setProductoId(pid);
            item.setCantidad(cant);
            items.add(item);
        });
        dto.setItems(items);

        try {
            // REQUIRES_NEW via self-proxy: si la venta falla (p.ej. stock), solo se
            // revierte su transacción — la del webhook sigue viva para guardar el
            // borrador intacto y responder al usuario.
            String resumen = catalog.resumenItems(e, empresaId);
            Pedido pedido = flujo.crearVentaTx(dto, v.getUsuario().getCorreo(), empresaId);
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "✅ Venta *" + esc(pedido.getNumeroPedido()) + "* registrada.\n\n"
                + resumen
                + "Utilidad: *" + colones(pedido.getUtilidadBruta()) + "*\n\n"
                + "Ya aparece en 💰 Ventas de hoy y en Finanzas.",
                List.of(List.of(TelegramClienteBotService.boton("📋 Menú", "menu"))));
        } catch (VentaMetodoRequierePasarelaException ex) {
            e.setPago(null);
            e.setP(P_VTA_PAGO);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), TelegramFlujoVentaCallbackHelper.MSG_PAGO_NO_PERMITIDO, List.of(
                List.of(TelegramClienteBotService.boton("Efectivo", "vta:pay:EFECTIVO"),
                        TelegramClienteBotService.boton("Cancelar", BTN_CANCELAR))));
        } catch (StockInsuficienteException ex) {
            bot.enviarMensaje(v.getChatId(), "⚠️ " + esc(ex.getMessage())
                + "\n\nEl stock cambió desde que armaste la venta. Ajustá las cantidades:", List.of(
                List.of(TelegramClienteBotService.boton("➕ Elegir productos", "vta:add"),
                        TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo confirmando venta en chat {} — {}", v.getChatId(), ex.getMessage());
            abuso.avisarErrorDeUsuario(v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude registrar la venta: " + esc(ex.getMessage())
                + "\nProbá de nuevo en unos minutos o registrala desde el panel.");
        }
    }
}
