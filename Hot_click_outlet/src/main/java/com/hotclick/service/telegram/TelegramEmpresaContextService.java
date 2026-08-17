package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TelegramEmpresaContextService {

    private static final Logger log = LoggerFactory.getLogger(TelegramEmpresaContextService.class);

    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired @Lazy private TelegramMenuBuilder     menuBuilder;

    public void mostrarSelectorEmpresa(TelegramVinculacion v) {
        List<MiembroEmpresa> membresias = miembroEmpresaRepository
            .findByUsuarioIdAndEstado(v.getUsuario().getId(), 1);
        if (membresias.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No tenés negocios asociados a tu cuenta.");
            return;
        }
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        for (MiembroEmpresa m : membresias) {
            String nombre = m.getEmpresa().getNombreComercial() != null
                ? m.getEmpresa().getNombreComercial() : m.getEmpresa().getNombreEmpresa();
            teclado.add(List.of(TelegramClienteBotService.boton(nombre, "emp:" + m.getEmpresa().getId())));
        }
        bot.enviarMensaje(v.getChatId(), "¿Qué negocio querés ver?", teclado);
    }

    public void seleccionarEmpresa(TelegramVinculacion v, String idCrudo) {
        long empresaId;
        try {
            empresaId = Long.parseLong(idCrudo);
        } catch (NumberFormatException e) {
            return;
        }
        // Seguridad: solo empresas donde el usuario es miembro ACTIVO
        if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(v.getUsuario().getId(), empresaId, 1)) {
            log.warn("[telegram-bot] usuario {} intentó activar empresa {} sin membresía", v.getUsuario().getId(), empresaId);
            bot.enviarMensaje(v.getChatId(), "No tenés acceso a ese negocio.");
            return;
        }
        v.setEmpresaActivaId(empresaId);
        v.setContexto(null);
        vinculacionRepository.save(v);
        menuBuilder.mostrarMenu(v);
    }

    /**
     * Empresa activa del chat, revalidando la membresía en cada consulta.
     * Si el propietario desactivó al miembro, el acceso muere aquí.
     */
    public Long empresaValidada(TelegramVinculacion v) {
        Long empresaId = v.getEmpresaActivaId();
        Long usuarioId = v.getUsuario().getId();
        if (empresaId != null) {
            boolean esMiembro = miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
                || empresaId.equals(v.getUsuario().getEmpresaId());
            if (esMiembro) return empresaId;
            v.setEmpresaActivaId(null);
            v.setContexto(null);
            vinculacionRepository.save(v);
        }
        List<MiembroEmpresa> membresias = miembroEmpresaRepository.findByUsuarioIdAndEstado(usuarioId, 1);
        if (membresias.size() == 1) {
            v.setEmpresaActivaId(membresias.get(0).getEmpresa().getId());
            vinculacionRepository.save(v);
            return v.getEmpresaActivaId();
        }
        if (membresias.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No tenés un negocio activo asociado a tu cuenta.");
        } else {
            mostrarSelectorEmpresa(v);
        }
        return null;
    }
}
