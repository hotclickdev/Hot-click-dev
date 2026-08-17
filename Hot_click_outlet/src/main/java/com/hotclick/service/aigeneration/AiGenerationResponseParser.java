package com.hotclick.service.aigeneration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AiProductoGeneradoDTO;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.service.AiQuotaService;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Parseo de respuesta Claude para fichas de producto generadas por IA.
 * Extraído bit-idéntico de AiGenerationService — no cambia comportamiento.
 */
public final class AiGenerationResponseParser {

    private static final Logger log = LoggerFactory.getLogger(AiGenerationResponseParser.class);

    private AiGenerationResponseParser() {}

    public static AiProductoGeneradoDTO parsearRespuesta(
            ObjectMapper mapper,
            InputSanitizer sanitizer,
            AiQuotaService aiQuotaService,
            String rawText,
            Long empresaId) throws Exception {
        // Claude a veces envuelve el JSON en un bloque de código markdown — lo limpiamos
        String json = rawText.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("(?s)^```\\w*\\n?", "")
                       .replaceAll("(?s)```\\s*$", "")
                       .trim();
        }

        JsonNode node = mapper.readTree(json);

        String titulo = sanitizer.cleanWithLimit(node.path("titulo_comercial").asText(""), 120);
        String desc   = sanitizer.cleanWithLimit(node.path("descripcion_optimizada_seo").asText(""), 600);

        List<String> etiquetas = new ArrayList<>();
        JsonNode arr = node.path("etiquetas_busqueda");
        if (arr.isArray()) {
            for (JsonNode tag : arr) {
                String t = sanitizer.cleanWithLimit(tag.asText("").trim(), 60);
                if (!t.isBlank() && etiquetas.size() < 10) etiquetas.add(t);
            }
        }

        if (titulo.isBlank()) {
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.RESPUESTA_INVALIDA,
                "La IA no pudo identificar el producto en la imagen. Intentá con una foto más clara y bien iluminada.");
        }

        // Créditos restantes para que el frontend actualice el contador sin un request extra
        int creditosRestantes = calcularCreditosRestantes(aiQuotaService, empresaId);

        return new AiProductoGeneradoDTO(titulo, desc, etiquetas, creditosRestantes);
    }

    static int calcularCreditosRestantes(AiQuotaService aiQuotaService, Long empresaId) {
        try {
            Map<String, Object> uso = aiQuotaService.getUsoMes(empresaId);
            int llamadas = (int) uso.getOrDefault("llamadas", 0);
            int limite   = (int) uso.getOrDefault("limite",   -1);
            if (limite < 0) return -1;                       // ilimitado
            return Math.max(0, limite - llamadas);
        } catch (Exception e) {
            log.warn("[ai-gen] No se pudo obtener créditos restantes: {}", e.getMessage());
            return -1;
        }
    }
}
