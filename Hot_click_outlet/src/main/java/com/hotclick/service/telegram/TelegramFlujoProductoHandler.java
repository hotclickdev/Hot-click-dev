package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Flujo de alta de producto (con fotos) del bot de Telegram.
 * Extraído bit-idéntico de TelegramFlujoService — las TX van por el proxy {@code flujo}.
 */
@Service
public class TelegramFlujoProductoHandler {

    @Autowired private TelegramFlujoSupport               support;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private TelegramFlujoProductoCallbackHelper callbackHelper;
    @Autowired private TelegramFlujoProductoTextoHelper    textoHelper;
    @Autowired private TelegramFlujoProductoConfirmHelper  confirm;

    public void callback(TelegramVinculacion v, Long empresaId, String sub) {
        if ("new".equals(sub)) {
            callbackHelper.manejarNuevo(v, empresaId);
            return;
        }

        TelegramFlujoEstado e = support.estadoVigente(v);
        if (e == null || !FLUJO_PRODUCTO.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Ese botón ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }

        if ("skip".equals(sub) && P_PRD_DESCRIPCION.equals(e.getP())) {
            e.setP(P_PRD_PRECIO_VENTA);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
        } else if (sub.startsWith("cat")) {
            callbackHelper.manejarCategoria(v, empresaId, e, sub);
        } else if (sub.startsWith("mar") || "martxt".equals(sub) || "marno".equals(sub)) {
            callbackHelper.manejarMarca(v, empresaId, e, sub);
        } else if ("fok".equals(sub) || "ok".equals(sub)) {
            callbackHelper.manejarConfirmacion(v, empresaId, e, sub);
        }
    }

    public void texto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        textoHelper.manejarPaso(v, empresaId, e, texto);
    }

    public boolean manejarFoto(TelegramVinculacion v, Long empresaId, JsonNode msg) {
        return confirm.manejarFoto(v, empresaId, msg);
    }
}
