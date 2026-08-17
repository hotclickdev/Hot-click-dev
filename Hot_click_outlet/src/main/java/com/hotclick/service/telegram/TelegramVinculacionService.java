package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    public Optional<TelegramVinculacion> vinculacionActiva(long chatId) {
        Optional<TelegramVinculacion> v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
        if (v.isPresent() && !Integer.valueOf(Constants.ESTADO_ACTIVO).equals(v.get().getUsuario().getEstado())) {
            return Optional.empty();
        }
        return v;
    }

    public void vincular(long chatId, String username, String codigoCrudo) {
        String codigo = codigoCrudo.replaceAll("[^A-Za-z0-9]", "");
        if (codigo.isEmpty() || codigo.length() > 16) {
            bot.enviarMensaje(chatId, "Ese código no es válido. Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        Optional<TelegramVinculacion> opt = vinculacionRepository.findByCodigo(codigo);
        if (opt.isEmpty() || opt.get().getCodigoExpira() == null
                || opt.get().getCodigoExpira().isBefore(LocalDateTime.now(Constants.ZONA_CR))) {
            bot.enviarMensaje(chatId, "El código no existe o ya venció (dura 10 minutos). Generá uno nuevo desde Configuración → Telegram en el panel.");
            return;
        }

        TelegramVinculacion v = opt.get();

        postLink.revocarVinculacionesPrevias(chatId, v.getUsuario().getId());

        v.setChatId(chatId);
        v.setTelegramUsername(username);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setFechaVinculacion(LocalDateTime.now(Constants.ZONA_CR));
        v.setCodigo(null);
        v.setCodigoExpira(null);
        v.setContexto(null);

        postLink.asignarEmpresaActiva(v);
        vinculacionRepository.save(v);

        List<MiembroEmpresa> membresias = postLink.membresiasActivas(v);
        postLink.enviarBienvenidaYMenu(chatId, v, membresias);
    }

    public void desvincular(TelegramVinculacion v) {
        Long chatId = v.getChatId();
        v.setEstado(TelegramVinculacion.REVOCADA);
        v.setChatId(null);
        v.setContexto(null);
        vinculacionRepository.save(v);
        bot.enviarMensaje(chatId, "Listo, tu Telegram quedó desvinculado. Podés volver a conectarlo cuando querás desde Configuración → Telegram en el panel.");
    }
}
