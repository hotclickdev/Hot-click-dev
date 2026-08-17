package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Post-vinculación de Telegram — extraído bit-idéntico de {@link TelegramVinculacionService}.
 */
@Component
class TelegramVinculacionPostLinkHelper {

    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramDatosQueryService     datosQuery;
    @Autowired @Lazy private TelegramEmpresaContextService empresaContext;
    @Autowired @Lazy private TelegramMenuBuilder     menuBuilder;

    void revocarVinculacionesPrevias(long chatId, Long usuarioId) {
        vinculacionRepository
            .findByChatIdAndEstadoAndUsuarioIdNot(chatId, TelegramVinculacion.ACTIVA, usuarioId)
            .forEach(otra -> {
                otra.setEstado(TelegramVinculacion.REVOCADA);
                otra.setChatId(null);
                otra.setContexto(null);
                vinculacionRepository.save(otra);
            });
    }

    void asignarEmpresaActiva(TelegramVinculacion v) {
        List<MiembroEmpresa> membresias = miembroEmpresaRepository
            .findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);

        if (membresias.isEmpty() && v.getUsuario().getEmpresaId() != null) {
            v.setEmpresaActivaId(v.getUsuario().getEmpresaId());
        } else if (membresias.size() == 1) {
            v.setEmpresaActivaId(membresias.get(0).getEmpresa().getId());
        }
    }

    void enviarBienvenidaYMenu(long chatId, TelegramVinculacion v, List<MiembroEmpresa> membresias) {
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

    List<MiembroEmpresa> membresiasActivas(TelegramVinculacion v) {
        return miembroEmpresaRepository.findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);
    }
}
