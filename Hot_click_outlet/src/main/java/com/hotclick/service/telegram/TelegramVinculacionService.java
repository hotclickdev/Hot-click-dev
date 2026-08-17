package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
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
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramDatosQueryService     datosQuery;
    @Autowired @Lazy private TelegramEmpresaContextService empresaContext;
    @Autowired @Lazy private TelegramMenuBuilder     menuBuilder;

    public Optional<TelegramVinculacion> vinculacionActiva(long chatId) {
        Optional<TelegramVinculacion> v = vinculacionRepository
            .findByChatIdAndEstado(chatId, TelegramVinculacion.ACTIVA);
        // Usuario desactivado en el panel → su Telegram tampoco tiene acceso
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

        // Un mismo chat de Telegram solo puede estar vinculado a UNA cuenta del panel
        vinculacionRepository
            .findByChatIdAndEstadoAndUsuarioIdNot(chatId, TelegramVinculacion.ACTIVA, v.getUsuario().getId())
            .forEach(otra -> {
                otra.setEstado(TelegramVinculacion.REVOCADA);
                otra.setChatId(null);
                otra.setContexto(null);
                vinculacionRepository.save(otra);
            });

        v.setChatId(chatId);
        v.setTelegramUsername(username);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setFechaVinculacion(LocalDateTime.now(Constants.ZONA_CR));
        v.setCodigo(null);        // un solo uso
        v.setCodigoExpira(null);
        v.setContexto(null);

        List<MiembroEmpresa> membresias = miembroEmpresaRepository
            .findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);

        if (membresias.isEmpty() && v.getUsuario().getEmpresaId() != null) {
            v.setEmpresaActivaId(v.getUsuario().getEmpresaId());
        } else if (membresias.size() == 1) {
            v.setEmpresaActivaId(membresias.get(0).getEmpresa().getId());
        }
        vinculacionRepository.save(v);

        String nombre = v.getUsuario().getNombre() != null ? v.getUsuario().getNombre() : "";
        bot.enviarMensaje(chatId, ("¡Hola " + datosQuery.esc(nombre) + "! Tu cuenta quedó vinculada con HotClick.\n\n"
                + "Desde acá podés consultar tu inventario, ventas y finanzas, y vas a recibir "
                + "avisos de cada venta y alertas de stock.").trim());

        if (membresias.size() > 1) {
            empresaContext.mostrarSelectorEmpresa(v);
        } else if (v.getEmpresaActivaId() != null) {
            menuBuilder.mostrarMenu(v);
        } else {
            bot.enviarMensaje(chatId, "Tu cuenta no tiene un negocio asociado todavía. Cuando lo tengás, escribí /menu.");
        }
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
