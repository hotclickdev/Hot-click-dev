package com.hotclick.service.copilot;

import com.hotclick.model.AiMensaje;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiMensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persistencia de mensajes del Copilot.
 * Extraído bit-idéntico de AiCopilotService.saveMsg — no cambia comportamiento.
 */
@Service
public class AiCopilotMessageStore {

    @Autowired private AiMensajeRepository aiMensajeRepository;

    @Transactional
    public void saveMsg(Empresa empresa, String rol, String contenido, int tokens) {
        if (empresa == null || contenido == null || contenido.isBlank()) return;
        AiMensaje msg = new AiMensaje();
        msg.setEmpresa(empresa);
        msg.setRol(rol);
        msg.setContenido(contenido);
        msg.setTokens(tokens);
        aiMensajeRepository.save(msg);
    }
}
