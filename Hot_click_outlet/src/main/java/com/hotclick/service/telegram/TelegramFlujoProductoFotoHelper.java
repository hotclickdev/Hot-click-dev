package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Resolución y subida de fotos del alta de producto — extraído bit-idéntico de {@link TelegramFlujoProductoConfirmHelper}.
 */
@Component
class TelegramFlujoProductoFotoHelper {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoProductoFotoHelper.class);

    @Autowired private TelegramFlujoSupport          support;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private SupabaseStorageService        storageService;
    @Autowired private TelegramFlujoProductoUiHelper ui;

    String resolverFileId(JsonNode msg) {
        if (msg.has("photo")) {
            JsonNode sizes = msg.path("photo");
            for (int i = sizes.size() - 1; i >= 0; i--) {
                long fs = sizes.get(i).path("file_size").asLong(Long.MAX_VALUE);
                if (fs <= MAX_FOTO_BYTES) return sizes.get(i).path("file_id").asText(null);
            }
            return null;
        }
        if (msg.has("document")) {
            JsonNode doc = msg.path("document");
            long fs = doc.path("file_size").asLong(Long.MAX_VALUE);
            if (fs <= MAX_FOTO_BYTES) return doc.path("file_id").asText(null);
        }
        return null;
    }

    boolean subirFotoAlBorrador(TelegramVinculacion vl, TelegramFlujoEstado e, String fileId) {
        List<String> fotos = e.getDraftSeguro().getFotos();
        bot.enviarAccionEscribiendo(vl.getChatId());
        byte[] bytes = bot.descargarArchivo(fileId, MAX_FOTO_BYTES);
        if (bytes == null) {
            bot.enviarMensaje(vl.getChatId(), "No pude descargar la foto. Mandala de nuevo, por favor.");
            return true;
        }
        try {
            String url = storageService.subirImagenDescargada(bytes, "telegram.jpg", "image/jpeg", "productos/telegram");
            fotos.add(url);
            support.guardar(vl, e);
            bot.enviarMensaje(vl.getChatId(),
                "Foto " + fotos.size() + " recibida ✅" + (fotos.size() < MAX_FOTOS
                    ? " Podés mandar otra (máx " + MAX_FOTOS + ") o tocar *Listo*."
                    : " Tocá *Listo* para continuar."),
                ui.tecladoFotos(fotos.size()));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo subiendo foto de chat {} — {}", vl.getChatId(), ex.getMessage());
            bot.enviarMensaje(vl.getChatId(), "No pude guardar la foto (" + ex.getMessage() + "). Probá con otra imagen.");
        }
        return true;
    }

    Optional<TelegramVinculacion> obtenerConLock(long chatId) {
        return vinculacionRepository.findWithLockByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
    }
}
