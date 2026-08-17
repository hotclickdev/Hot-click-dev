package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class TelegramCallbackHandler {

    private static final Logger log = LoggerFactory.getLogger(TelegramCallbackHandler.class);

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramRateLimitService      rateLimit;
    @Autowired private TelegramVinculacionService    vinculacion;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramMenuBuilder           menuBuilder;
    @Autowired private TelegramDatosQueryService     datosQuery;
    @Autowired private TelegramStockCheckService     stockCheck;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramFlujoService          telegramFlujoService;

    public void procesarCallback(JsonNode cb) {
        long chatId = cb.path("message").path("chat").path("id").asLong(0);
        String data = cb.path("data").asText("");
        bot.responderCallback(cb.path("id").asText(null));
        if (chatId == 0 || data.isEmpty()) return;
        if (!rateLimit.permitidoPorRateLimit(chatId)) return;

        Optional<TelegramVinculacion> opt = vinculacion.vinculacionActiva(chatId);
        if (opt.isEmpty()) {
            bot.enviarMensaje(chatId, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
            return;
        }
        TelegramVinculacion v = opt.get();

        if (data.startsWith("emp:")) { empresaContext.seleccionarEmpresa(v, data.substring(4)); return; }
        if (data.startsWith("chk:")) { stockCheck.iniciarAjuste(v, data.substring(4)); return; }

        // Flujos guiados (venta rápida, alta de producto, clientes, confirmación de
        // acción propuesta por la IA) — TelegramFlujoService
        if (data.startsWith("vta:") || data.startsWith("prd:") || data.startsWith("cli:")
                || data.startsWith("acn:") || "flx:x".equals(data)) {
            Long empresaIdFlujo = empresaContext.empresaValidada(v);
            if (empresaIdFlujo != null) telegramFlujoService.manejarCallback(v, empresaIdFlujo, data);
            return;
        }

        switch (data) {
            case "menu"     -> menuBuilder.mostrarMenu(v);
            case "selector" -> empresaContext.mostrarSelectorEmpresa(v);
            case "inv"      -> datosQuery.responderConDatos(v, datosQuery::mensajeInventario);
            case "ventas"   -> datosQuery.responderConDatos(v, datosQuery::mensajeVentasHoy);
            case "fin"      -> datosQuery.responderConDatos(v, datosQuery::mensajeFinanzasMes);
            case "chkok"    -> {
                v.setContexto(null);
                vinculacionRepository.save(v);
                bot.enviarMensaje(v.getChatId(), "Perfecto, inventario confirmado. ¡Gracias!");
            }
            default -> log.warn("[telegram-bot] callback desconocido '{}' de chat {}", data, chatId);
        }
    }
}
