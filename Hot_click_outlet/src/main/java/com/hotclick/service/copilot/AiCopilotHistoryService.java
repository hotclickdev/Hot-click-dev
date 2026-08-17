package com.hotclick.service.copilot;

import com.hotclick.repository.AiMensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Historial del Copilot (hot_click_ai_mensaje_tb).
 * Extraído bit-idéntico de AiCopilotService — no cambia comportamiento.
 */
@Service
public class AiCopilotHistoryService {

    @Autowired private AiMensajeRepository aiMensajeRepository;

    /** Returns the last HISTORY_TURNS messages for the empresa. */
    public List<Map<String, Object>> getHistorial(Long empresaId) {
        return aiMensajeRepository.findByEmpresaIdOrderByFechaCreacionAsc(
            empresaId, PageRequest.of(0, 50))
            .stream().map(m -> Map.<String, Object>of(
                "id",       m.getId(),
                "rol",      m.getRol(),
                "contenido", m.getContenido(),
                "fecha",    m.getFechaCreacion() != null ? m.getFechaCreacion().toString() : ""
            )).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public void limpiarHistorial(Long empresaId) {
        aiMensajeRepository.deleteByEmpresaId(empresaId);
    }
}
