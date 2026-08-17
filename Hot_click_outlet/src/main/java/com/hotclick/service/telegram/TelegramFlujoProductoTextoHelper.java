package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TextModerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Texto del flujo de alta de producto — extraído bit-idéntico de {@link TelegramFlujoProductoHandler}.
 */
@Component
class TelegramFlujoProductoTextoHelper {

    @Autowired private TelegramFlujoSupport          support;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TextModerationService         textModerationService;
    @Autowired private TelegramFlujoProductoUiHelper ui;

    void manejarPaso(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        switch (e.getP()) {
            case P_PRD_NOMBRE -> manejarNombre(v, e, d, texto);
            case P_PRD_DESCRIPCION -> manejarDescripcion(v, e, d, texto);
            case P_PRD_PRECIO_VENTA -> manejarPrecioVenta(v, e, d, texto);
            case P_PRD_PRECIO_COMPRA -> manejarPrecioCompra(v, e, d, texto);
            case P_PRD_STOCK -> manejarStock(v, empresaId, e, d, texto);
            case P_PRD_MARCA_TEXTO -> {
                d.setMarcaTxt(texto.length() > 100 ? texto.substring(0, 100) : texto);
                ui.irAPasoFotos(v, e);
            }
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.");
        }
    }

    private void manejarNombre(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        if (texto.length() < 3 || texto.length() > 200) {
            bot.enviarMensaje(v.getChatId(), "El nombre debe tener entre 3 y 200 caracteres. Escribilo de nuevo:");
            return;
        }
        if (!textModerationService.moderar(texto).safe()) {
            bot.enviarMensaje(v.getChatId(), "Ese nombre no está permitido en la plataforma. Escribí otro:");
            return;
        }
        d.setNom(texto);
        e.setP(P_PRD_DESCRIPCION);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "Descripción corta (máx 255 caracteres):", List.of(
            List.of(TelegramClienteBotService.boton("⏭️ Omitir", "prd:skip"),
                    TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    private void manejarDescripcion(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        String desc = texto.length() > 255 ? texto.substring(0, 255) : texto;
        if (!textModerationService.moderar(desc).safe()) {
            bot.enviarMensaje(v.getChatId(), "Esa descripción no está permitida en la plataforma. Escribí otra u *Omitir*:");
            return;
        }
        d.setDesc(desc);
        e.setP(P_PRD_PRECIO_VENTA);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
    }

    private void manejarPrecioVenta(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer pv = parseEntero(texto, 1, 100_000_000);
        if (pv == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un precio en colones (ej: 8500). Escribilo de nuevo:");
            return;
        }
        d.setPv(pv);
        e.setP(P_PRD_PRECIO_COMPRA);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Cuánto te costó a vos? (precio de compra en colones — sirve para calcular tu ganancia)");
    }

    private void manejarPrecioCompra(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer pc = parseEntero(texto, 0, 100_000_000);
        if (pc == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número en colones (ej: 5000). Escribilo de nuevo:");
            return;
        }
        d.setPc(pc);
        e.setP(P_PRD_STOCK);
        support.guardar(v, e);
        String aviso = avisoCostoMayorVenta(pc, d.getPv());
        bot.enviarMensaje(v.getChatId(), aviso + "¿Cuántas unidades tenés en stock?");
    }

    private void manejarStock(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer stk = parseEntero(texto, 0, 1_000_000);
        if (stk == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 10). Escribilo de nuevo:");
            return;
        }
        d.setStk(stk);
        e.setP(P_PRD_CATEGORIA);
        support.guardar(v, e);
        ui.mostrarCategorias(v, empresaId, 0);
    }

    private static String avisoCostoMayorVenta(Integer pc, Integer precioVenta) {
        int pv = precioVenta != null ? precioVenta : 0;
        if (pc > pv) {
            return "⚠️ Ojo: el costo es mayor que el precio de venta — venderías con pérdida.\n\n";
        }
        return "";
    }
}
