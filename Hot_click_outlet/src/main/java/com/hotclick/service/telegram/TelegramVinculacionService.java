package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TelegramVinculacionService {

    public static final String MENSAJE_NO_VINCULADO =
        "Este chat no está vinculado a ninguna cuenta de HotClick.\n\n"
        + "Para conectarlo: entrá al panel → Configuración → Telegram → \"Conectar Telegram\" "
        + "y tocá el botón que te aparece.";

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionPostLinkHelper postLink;
    @Autowired private TelegramVinculacionCanje      canjeAtomico;

    public Optional<TelegramVinculacion> vinculacionActiva(long chatId) {
        Optional<TelegramVinculacion> v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
        if (v.isPresent() && !Integer.valueOf(Constants.ESTADO_ACTIVO).equals(v.get().getUsuario().getEstado())) {
            return Optional.empty();
        }
        return v;
    }

    public void vincular(long chatId, String username, String codigoCrudo) {
        String codigo = codigoCrudo.replaceAll("[^A-Za-z0-9]", "").toUpperCase(java.util.Locale.ROOT); // TG3: códigos se generan en mayúsculas
        if (codigo.isEmpty() || codigo.length() > 16) {
            bot.enviarMensaje(chatId, "Ese código no es válido. Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        // Canje atómico y committeado ANTES de hablar con Telegram (nada de I/O dentro de la transacción).
        Optional<TelegramVinculacionCanje.Canjeado> canje;
        try {
            canje = canjeAtomico.canjear(chatId, username, codigo);
        } catch (RuntimeException ex) {
            canje = Optional.empty(); // p. ej. carrera de bloqueo: se trata como código inválido, nunca como vinculado
        }
        if (canje.isEmpty()) {
            bot.enviarMensaje(chatId, "El código no existe o ya venció (dura 10 minutos). Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        TelegramVinculacion v = canje.get().vinculacion();
        avisarChatReemplazado(canje.get().chatAnterior(), chatId);
        canje.get().chatsRevocados().forEach(viejo -> avisarChatReemplazado(viejo, chatId));

        List<MiembroEmpresa> membresias = postLink.membresiasActivas(v);
        postLink.enviarBienvenidaYMenu(chatId, v, membresias);
    }

    private void avisarChatReemplazado(Long chatAnterior, long chatNuevo) {
        if (chatAnterior == null || chatAnterior == chatNuevo) return;
        bot.enviarMensaje(chatAnterior,
            "Esta cuenta de HotClick se vinculó a otro Telegram. Este chat ya no tiene acceso.");
    }

    public void desvincular(TelegramVinculacion v) {
        Long chatId = v.getChatId();
        v.revocar();
        vinculacionRepository.revocarPorId(v.getId());
        bot.enviarMensaje(chatId, "Listo, tu Telegram quedó desvinculado. Podés volver a conectarlo cuando querás desde Configuración → Telegram en el panel.");
    }
}
