package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Callbacks del flujo de venta rápida — extraído bit-idéntico de {@link TelegramFlujoVentaHandler}.
 */
@Component
class TelegramFlujoVentaCallbackHelper {

    @Autowired private TelegramFlujoSupport              support;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private TelegramFlujoVentaCatalogHelper    catalog;
    @Autowired private TelegramFlujoVentaConfirmHelper  confirm;

    /** @return true si el callback fue consumido. */
    boolean manejarNuevo(TelegramVinculacion v, Long empresaId) {
        if (support.denegarSiNoGestiona(v, empresaId)) return true;
        TelegramFlujoEstado e = TelegramFlujoEstado.nuevaVenta(support.ahora());
        support.guardar(v, e);
        catalog.mostrarPaginaProductos(v, empresaId, 0);
        return true;
    }

    void manejarProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String sub) {
        if (sub.startsWith("pg:")) {
            Integer pg = parseEntero(sub.substring(3), 0, 10_000);
            catalog.mostrarPaginaProductos(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("p:")) {
            catalog.seleccionarProductoVenta(v, empresaId, e, sub.substring(2));
        } else if ("add".equals(sub)) {
            e.setP(P_VTA_PRODUCTO);
            e.setPid(null);
            support.guardar(v, e);
            catalog.mostrarPaginaProductos(v, empresaId, 0);
        } else if ("cont".equals(sub)) {
            if (e.getItemsSeguro().isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Todavía no agregaste ningún producto.");
                catalog.mostrarPaginaProductos(v, empresaId, 0);
                return;
            }
            e.setP(P_VTA_PAGO);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Cómo te pagaron?", List.of(
                List.of(TelegramClienteBotService.boton("📱 SINPE", "vta:pay:SINPE"),
                        TelegramClienteBotService.boton("💵 Efectivo", "vta:pay:EFECTIVO")),
                List.of(TelegramClienteBotService.boton("💳 Tarjeta", "vta:pay:TARJETA"),
                        TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        }
    }

    void manejarPagoYCliente(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String sub) {
        if (sub.startsWith("pay:")) {
            String metodo = sub.substring(4);
            if (!METODOS_PAGO.contains(metodo)) return;
            e.setPago(metodo);
            e.setP(P_VTA_CLIENTE);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(),
                "¿A quién le vendiste? Asociar el cliente sirve para su historial de compras (opcional).",
                List.of(
                    List.of(TelegramClienteBotService.boton("🔍 Buscar cliente", "vta:cliq"),
                            TelegramClienteBotService.boton("➕ Cliente nuevo", "vta:clinew")),
                    List.of(TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"),
                            TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        } else if ("cliq".equals(sub)) {
            e.setP(P_VTA_CLIENTE_BUSCAR);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre, teléfono o correo del cliente:");
        } else if ("clinew".equals(sub)) {
            e.setP(P_VTA_CLIENTE_NUEVO);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre y teléfono del cliente (ej: _Ana Mora 8888-8888_):");
        } else if ("nocli".equals(sub)) {
            e.setCli(null);
            confirm.mostrarResumenVenta(v, empresaId, e);
        } else if (sub.startsWith("cli:")) {
            Long clienteId = parseLong(sub.substring(4));
            if (clienteId == null || !support.clientePerteneceAEmpresa(clienteId, empresaId)) {
                bot.enviarMensaje(v.getChatId(), "Ese cliente no pertenece a tu negocio.");
                return;
            }
            e.setCli(clienteId);
            confirm.mostrarResumenVenta(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirm.confirmarVenta(v, empresaId, e);
        }
    }
}
