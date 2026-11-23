package com.hotclick.service.copilot;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Rol real del usuario autenticado para el copilot web. Se calcula SIEMPRE en el servidor
 * y en el hilo del request (el hilo SSE no hereda el SecurityContext): nunca desde el body.
 */
@Component
public class AiCopilotRolResolver {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private TelegramFlujoSupport flujoSupport;

    /** Misma regla que Telegram ({@link TelegramFlujoSupport#esDueno}). Fail-closed: sin auth o sin usuario → false. */
    public boolean esDuenoActual(Long empresaId) {
        if (empresaId == null) return false;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null
            || "anonymousUser".equals(auth.getName())) {
            return false;
        }
        Usuario usuario = usuarioRepository.findByCorreo(auth.getName()).orElse(null);
        return flujoSupport.esDueno(usuario, empresaId);
    }
}
