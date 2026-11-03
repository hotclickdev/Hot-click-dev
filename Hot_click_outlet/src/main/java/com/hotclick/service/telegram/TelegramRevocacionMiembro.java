package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramBloqueoEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramBloqueoEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * N1 (área 8): «Revocar» en el Telegram del equipo corta SOLO el bot para esa empresa. Guarda un
 * bloqueo (usuario, empresa) que respeta {@code TelegramEmpresaContextService}; la membresía web
 * ({@code miembro_empresa}) y las otras empresas no se tocan. El propietario no se revoca. Queda en
 * la bitácora de admin. Un usuario por llamada: consultas puntuales, ninguna en bucle.
 */
@Component
public class TelegramRevocacionMiembro {

    private static final Logger log = LoggerFactory.getLogger(TelegramRevocacionMiembro.class);

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private TelegramBloqueoEmpresaRepository bloqueoRepository;
    @Autowired private AuditoriaAdminRegistroService auditoria;

    @Transactional
    public boolean revocar(Long usuarioId, Long empresaId) {
        MiembroEmpresa m = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1).orElse(null);
        if (m == null || "PROPIETARIO".equals(m.getRolEnEmpresa())) return false;
        if (bloqueoRepository.existsByUsuarioIdAndEmpresaId(usuarioId, empresaId)) return true; // idempotente
        bloqueoRepository.save(new TelegramBloqueoEmpresa(usuarioId, empresaId,
            LocalDateTime.now(Constants.ZONA_CR), null));
        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(usuarioId).orElse(null);
        if (v != null && empresaId.equals(v.getEmpresaActivaId())) {
            v.setEmpresaActivaId(null);
            v.setContexto(null);
            vinculacionRepository.save(v);
        }
        auditoria.registrar("TELEGRAM_REVOCAR_MIEMBRO", "USUARIO", usuarioId, empresaId,
            "Acceso por Telegram del usuario " + usuarioId + " a la empresa " + empresaId
                + " revocado; la membresía web no cambia");
        log.info("[telegram] bot de usuario {} bloqueado para empresa {} por gestor (membresía web intacta)",
            usuarioId, empresaId);
        return true;
    }
}
