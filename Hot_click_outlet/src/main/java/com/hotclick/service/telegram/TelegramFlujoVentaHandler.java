package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import static com.hotclick.dto.TelegramFlujoEstado.*;

/**
 * Flujo de venta rápida del bot de Telegram.
 * Extraído bit-idéntico de TelegramFlujoService — las TX van por el proxy {@code flujo}.
 */
@Service
public class TelegramFlujoVentaHandler {

    @Autowired private TelegramFlujoSupport              support;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private TelegramFlujoVentaCallbackHelper  callbackHelper;
    @Autowired private TelegramFlujoVentaTextoHelper       textoHelper;

    public void callback(TelegramVinculacion v, Long empresaId, String sub) {
        if ("new".equals(sub)) {
            callbackHelper.manejarNuevo(v, empresaId);
            return;
        }

        TelegramFlujoEstado e = support.estadoVigente(v);
        if (e == null || !FLUJO_VENTA.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Ese botón ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }

        if (sub.startsWith("pg:") || sub.startsWith("p:") || "add".equals(sub) || "cont".equals(sub)) {
            callbackHelper.manejarProducto(v, empresaId, e, sub);
        } else {
            callbackHelper.manejarPagoYCliente(v, empresaId, e, sub);
        }
    }

    public void texto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        textoHelper.manejarPaso(v, empresaId, e, texto);
    }
}
