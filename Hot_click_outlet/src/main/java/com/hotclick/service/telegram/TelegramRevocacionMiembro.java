package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * TG3: el gestor desactiva SOLO la membresía del usuario en su empresa. El acceso por Telegram a esa
 * empresa muere porque {@code empresaValidada} revalida la membresía; las demás empresas siguen.
 * El propietario no se revoca. Un usuario por llamada: 3-4 consultas puntuales, ninguna en bucle.
 */
@Component
public class TelegramRevocacionMiembro {

    private static final Logger log = LoggerFactory.getLogger(TelegramRevocacionMiembro.class);

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    @Transactional
    public boolean revocar(Long usuarioId, Long empresaId) {
        MiembroEmpresa m = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1).orElse(null);
        if (m == null || "PROPIETARIO".equals(m.getRolEnEmpresa())) return false;
        m.setEstado(0);
        miembroEmpresaRepository.save(m);
        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(usuarioId).orElse(null);
        if (v != null) {
            // empresaValidada también acepta usuario.empresa → fail-closed. Sin otras membresías, se revoca entero.
            boolean empresaPropia = v.getUsuario() != null && empresaId.equals(v.getUsuario().getEmpresaId());
            if (empresaPropia || !miembroEmpresaRepository.existsByUsuarioIdAndEstado(usuarioId, 1)) {
                v.setEstado(TelegramVinculacion.REVOCADA);
                v.setChatId(null);
                v.setContexto(null);
                v.setCodigo(null);
                v.setCodigoExpira(null);
                vinculacionRepository.save(v);
            } else if (empresaId.equals(v.getEmpresaActivaId())) {
                v.setEmpresaActivaId(null);
                v.setContexto(null);
                vinculacionRepository.save(v);
            }
        }
        log.info("[telegram] membresía de usuario {} en empresa {} desactivada por gestor", usuarioId, empresaId);
        return true;
    }
}
