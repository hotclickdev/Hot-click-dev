package com.hotclick.service.copilot;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.repository.AiMensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiCopilotRequestBuilder {

    private static final int HISTORY_TURNS = 8; // last N messages sent as context — bounds input tokens

    @Value("${nvidia.model:meta/llama-3.1-70b-instruct}")
    private String model;

    @Autowired private AiMensajeRepository aiMensajeRepository;
    @Autowired private ObjectMapper        objectMapper;

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

    public String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId) {
        return buildRequestBody(systemPrompt, messages, tenantId, true);
    }

    public String buildRequestBody(String systemPrompt, List<Map<String, Object>> messages, Long tenantId, boolean stream) {
        try {
            // Formato OpenAI chat completions: el system prompt va como mensaje, no como
            // campo top-level separado (a diferencia de la Messages API de Claude).
            List<Map<String, Object>> chatMessages = new ArrayList<>();
            chatMessages.add(Map.of("role", "system", "content", systemPrompt));
            chatMessages.addAll(messages);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model",      model);
            body.put("max_tokens", 1024);
            body.put("stream",     stream);
            if (stream) body.put("stream_options", Map.of("include_usage", true));
            body.put("messages",   chatMessages);
            // Stop sequences prevent prompt injection: if a reply tries to impersonate
            // "Human:" or "User:", NVIDIA stops immediately instead of continuing the loop.
            body.put("stop", List.of("\n\nHuman:", "\n\nUser:", "Human:", "User:"));
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IntegracionExternaException("nvidia-api", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                tenantId, "No se pudo serializar el request a NVIDIA API", e);
        }
    }
}
