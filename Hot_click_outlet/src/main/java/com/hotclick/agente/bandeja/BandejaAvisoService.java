package com.hotclick.agente.bandeja;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * AG-18: avisa por Telegram a quien recibe una conversación asignada. El aviso no lleva nada de la persona que
 * escribió (ni nombre, ni contacto, ni texto): solo el canal y que hay algo pendiente en la bandeja. Un fallo de
 * Telegram nunca afecta la asignación. En el panel el aviso es el contador de la bandeja ({@code /api/bandeja/resumen}).
 */
@Service
public class BandejaAvisoService {

    private static final Logger log = LoggerFactory.getLogger(BandejaAvisoService.class);

    private final TelegramVinculacionRepository vinculaciones;
    private final TelegramClienteBotService bot;

    public BandejaAvisoService(TelegramVinculacionRepository vinculaciones, TelegramClienteBotService bot) {
        this.vinculaciones = vinculaciones;
        this.bot = bot;
    }

    /** @return true si se intentó el envío (el usuario tiene Telegram vinculado y activo). */
    public boolean avisarAsignacion(Long usuarioDestinoId, String canal) {
        try {
            if (usuarioDestinoId == null || !bot.isConfigured()) return false;
            TelegramVinculacion v = vinculaciones.findByUsuarioId(usuarioDestinoId).orElse(null);
            if (v == null || !TelegramVinculacion.ACTIVA.equals(v.getEstado()) || v.getChatId() == null) return false;
            bot.enviarMensaje(v.getChatId(), textoAviso(canal), null, false);
            return true;
        } catch (Exception e) {
            log.warn("[bandeja-aviso] no se pudo avisar por Telegram — {}", e.getClass().getSimpleName());
            return false;
        }
    }

    static String textoAviso(String canal) {
        String nombre = switch (canal == null ? "" : canal.toUpperCase(Locale.ROOT)) {
            case "WHATSAPP" -> "WhatsApp";
            case "INSTAGRAM" -> "Instagram";
            case "MESSENGER" -> "Messenger";
            default -> "un canal";
        };
        return "Te asignaron una conversación de " + nombre + ". Entrá a la Bandeja del panel de HotClick para atenderla.";
    }
}
