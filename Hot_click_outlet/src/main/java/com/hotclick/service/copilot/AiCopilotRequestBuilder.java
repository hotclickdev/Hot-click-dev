package com.hotclick.service.copilot;

import com.hotclick.repository.AiMensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AiCopilotRequestBuilder {

    private static final int HISTORY_TURNS = 8; // last N messages sent as context — bounds input tokens

    @Autowired private AiMensajeRepository aiMensajeRepository;

    public List<Map<String, Object>> buildMessages(Long empresaId, String userMessage) {
        List<Map<String, Object>> history = aiMensajeRepository
            .findByEmpresaIdOrderByFechaCreacionAsc(empresaId, PageRequest.of(0, HISTORY_TURNS))
            .stream().map(m -> {
                String content = m.getContenido();
                return Map.<String, Object>of("role", m.getRol(), "content", content != null ? content : "");
            })
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        history.add(Map.of("role", "user", "content", userMessage));
        return history;
    }
}
