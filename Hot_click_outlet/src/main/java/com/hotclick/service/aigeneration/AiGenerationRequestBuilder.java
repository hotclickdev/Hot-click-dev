package com.hotclick.service.aigeneration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Construcción del request multimodal a Claude para fichas de producto.
 * Extraído bit-idéntico de AiGenerationService — no cambia comportamiento.
 */
public final class AiGenerationRequestBuilder {

    private AiGenerationRequestBuilder() {}

    public static Map<String, Object> buildRequestBody(
            String model,
            int maxTokens,
            String base64,
            String mediaType,
            String categoria,
            String marca) {

        // Pista contextual opcional para mejorar la calidad de la respuesta
        StringBuilder hint = new StringBuilder();
        if (categoria != null && !categoria.isBlank())
            hint.append("Categoría: ").append(categoria.trim()).append(". ");
        if (marca != null && !marca.isBlank())
            hint.append("Marca: ").append(marca.trim()).append(". ");

        String userText = hint.isEmpty()
            ? "Analizá este producto y generá su ficha comercial en JSON."
            : hint + "Tomá en cuenta esta información al generar la ficha.";

        // Bloque imagen (multimodal)
        Map<String, Object> imageSource = new LinkedHashMap<>();
        imageSource.put("type",       "base64");
        imageSource.put("media_type", mediaType);
        imageSource.put("data",       base64);

        Map<String, Object> imageContent = new LinkedHashMap<>();
        imageContent.put("type",   "image");
        imageContent.put("source", imageSource);

        Map<String, Object> textContent = new LinkedHashMap<>();
        textContent.put("type", "text");
        textContent.put("text", userText);

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role",    "user");
        message.put("content", List.of(imageContent, textContent));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model",      model);
        body.put("max_tokens", maxTokens);
        body.put("system",     AiGenerationPrompts.SYSTEM_PROMPT);
        body.put("messages",   List.of(message));
        return body;
    }
}
