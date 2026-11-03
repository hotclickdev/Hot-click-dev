package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramBloqueoEmpresaRepository;
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
    @Autowired(required = false) private TelegramBloqueoEmpresaRepository bloqueoRepository;
    @Autowired private TelegramDatosQueryService     datosQuery;
    @Autowired @Lazy private TelegramEmpresaContextService empresaContext;
    @Autowired @Lazy private TelegramMenuBuilder     menuBuilder;

    void revocarVinculacionesPrevias(long chatId, Long usuarioId) {
        vinculacionRepository
            .findByChatIdAndEstadoAndUsuarioIdNot(chatId, TelegramVinculacion.ACTIVA, usuarioId)
            .forEach(otra -> {
                Long viejo = otra.getChatId();
                if (viejo != null) {
                    bot.enviarMensaje(viejo,
                        "Esta cuenta de HotClick se vinculó a otro Telegram. Este chat ya no tiene acceso.");
                }
                otra.setEstado(TelegramVinculacion.REVOCADA);
                otra.setChatId(null);
                otra.setContexto(null);
                vinculacionRepository.save(otra);
            });
    }

    void asignarEmpresaActiva(TelegramVinculacion v) {
        List<MiembroEmpresa> membresias = membresiasActivas(v);

        if (membresias.isEmpty() && v.getUsuario().getEmpresaId() != null
                && !(bloqueoRepository != null && bloqueoRepository.existsByUsuarioIdAndEmpresaId(
                    v.getUsuario().getId(), v.getUsuario().getEmpresaId()))) {
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
        List<MiembroEmpresa> todas = miembroEmpresaRepository.findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);
        if (bloqueoRepository == null || todas.isEmpty()) return todas;
        java.util.Set<Long> bloqueadas = new java.util.HashSet<>(
            bloqueoRepository.findEmpresaIdsByUsuarioId(v.getUsuario().getId()));
        return sinBloqueadas(todas, bloqueadas);
    }

    /** N1 área 8: al vincular no se asigna ni se ofrece una empresa donde el bot fue revocado. */
    static List<MiembroEmpresa> sinBloqueadas(List<MiembroEmpresa> todas, java.util.Set<Long> bloqueadas) {
        if (bloqueadas.isEmpty()) return todas;
        return todas.stream().filter(m -> !bloqueadas.contains(m.getEmpresa().getId())).toList();
    }
}
