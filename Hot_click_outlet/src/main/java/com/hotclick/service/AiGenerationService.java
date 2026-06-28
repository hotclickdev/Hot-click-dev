package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AiProductoGeneradoDTO;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.utils.InputSanitizer;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Genera fichas comerciales de productos analizando imágenes con la API de Claude (visión).
 *
 * Flujo atómico de cuota:
 *   1. verificarYReservar()  — decrementa el slot ANTES del call HTTP
 *   2. callClaude()          — envía la imagen; si falla, el slot ya fue consumido (por diseño)
 *   3. actualizarTokens()    — registra tokens reales DESPUÉS del call exitoso
 */
@Service
public class AiGenerationService {

    private static final Logger log = LoggerFactory.getLogger(AiGenerationService.class);

    private static final String ANTHROPIC_URL   = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int    MAX_TOKENS      = 1024;

    private static final Set<String> ALLOWED_MEDIA_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    // ── Dependencias ──────────────────────────────────────────────────────────

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    @Autowired private AiQuotaService  aiQuotaService;
    @Autowired private InputSanitizer  sanitizer;

    private final RestTemplate rest;
    private final ObjectMapper mapper = new ObjectMapper();

    public AiGenerationService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(45_000);   // Claude con imágenes puede tardar hasta ~30 s
        this.rest = new RestTemplate(factory);
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Genera título, descripción SEO y etiquetas de búsqueda para un producto
     * a partir de su imagen. Descuenta 1 crédito de IA del tenant.
     *
     * @param empresaId    tenant del usuario autenticado
     * @param imagen       foto del producto (JPG/PNG/WebP, máx 10 MB)
     * @param categoriaHint nombre de la categoría (opcional, mejora el resultado)
     * @param marcaHint     nombre de la marca (opcional, mejora el resultado)
     */
    @CircuitBreaker(name = "claude")
    public AiProductoGeneradoDTO generarFichaProducto(
            Long empresaId,
            MultipartFile imagen,
            String categoriaHint,
            String marcaHint) {

        validarApiKey();
        validarImagen(imagen);

        // Reserva atómica: decrementa el contador ANTES del call para evitar TOCTOU
        if (!aiQuotaService.verificarYReservar(empresaId)) {
            throw new PlanLimitException(
                "No tenés créditos de IA disponibles. Verificá tu plan o esperá el próximo mes.",
                "ai",
                "Ve a Configuración → Suscripción para ampliar tu cuota de IA."
            );
        }

        try {
            byte[] bytes   = imagen.getBytes();
            String base64  = Base64.getEncoder().encodeToString(bytes);
            String mediaType = normalizeMediaType(imagen.getContentType());

            Map<String, Object> requestBody = buildRequestBody(base64, mediaType, categoriaHint, marcaHint);
            ResponseEntity<String> response = callClaude(requestBody);

            JsonNode root        = mapper.readTree(response.getBody());
            int     inputTokens  = root.path("usage").path("input_tokens").asInt(0);
            int     outputTokens = root.path("usage").path("output_tokens").asInt(0);

            // Registra tokens reales; las llamadas ya fueron incrementadas por verificarYReservar
            aiQuotaService.actualizarTokens(empresaId, inputTokens, outputTokens);

            String rawText = root.path("content").get(0).path("text").asText("");
            AiProductoGeneradoDTO dto = parsearRespuesta(rawText, empresaId);

            log.info("[ai-gen] empresa={} model={} tokensIn={} tokensOut={} restantes={}",
                empresaId, model, inputTokens, outputTokens, dto.creditosRestantes());
            return dto;

        } catch (PlanLimitException e) {
            throw e;
        } catch (Exception e) {
            log.error("[ai-gen] Error empresa={}: {}", empresaId, e.getMessage(), e);
            throw new IntegracionExternaException("claude", IntegracionExternaException.Tipo.IO_ERROR,
                "Error al generar la ficha con IA. Intentá de nuevo en unos momentos.", e);
        }
    }

    // ── Validaciones de entrada ───────────────────────────────────────────────

    private void validarApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("El servicio de IA no está habilitado en este entorno.");
        }
    }

    private void validarImagen(MultipartFile imagen) {
        if (imagen == null || imagen.isEmpty()) {
            throw new IllegalArgumentException("Debés adjuntar una imagen del producto.");
        }
        if (imagen.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("La imagen no puede superar 10 MB.");
        }
        String ct = imagen.getContentType();
        if (ct == null || !ALLOWED_MEDIA_TYPES.contains(ct.toLowerCase())) {
            throw new IllegalArgumentException(
                "Formato de imagen no soportado. Usá JPG, PNG o WebP.");
        }
        try {
            byte[] header = imagen.getBytes();
            if (header.length < 4) throw new IllegalArgumentException("Archivo demasiado pequeño para ser una imagen válida.");
            boolean validHeader =
                ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8) || // JPEG
                ((header[0] & 0xFF) == 0x89 && header[1] == 0x50)           || // PNG
                (header[0] == 0x52 && header[1] == 0x49);                       // WebP/RIFF
            if (!validHeader) throw new IllegalArgumentException("El contenido del archivo no coincide con el formato declarado.");
        } catch (java.io.IOException e) {
            throw new IllegalArgumentException("No se pudo leer el archivo.");
        }
    }

    private String normalizeMediaType(String contentType) {
        if (contentType == null) return "image/jpeg";
        // La API de Claude no acepta "image/jpg"; requiere "image/jpeg"
        return contentType.equalsIgnoreCase("image/jpg") ? "image/jpeg" : contentType.toLowerCase();
    }

    // ── Construcción del request a Claude ────────────────────────────────────

    private Map<String, Object> buildRequestBody(
            String base64, String mediaType, String categoria, String marca) {

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
        body.put("max_tokens", MAX_TOKENS);
        body.put("system",     SYSTEM_PROMPT);
        body.put("messages",   List.of(message));
        return body;
    }

    private ResponseEntity<String> callClaude(Map<String, Object> body) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key",          apiKey);
        headers.set("anthropic-version",   ANTHROPIC_VERSION);

        String json = mapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(json, headers);

        return rest.postForEntity(ANTHROPIC_URL, entity, String.class);
    }

    // ── Parseo de la respuesta ────────────────────────────────────────────────

    private AiProductoGeneradoDTO parsearRespuesta(String rawText, Long empresaId) throws Exception {
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
        int creditosRestantes = calcularCreditosRestantes(empresaId);

        return new AiProductoGeneradoDTO(titulo, desc, etiquetas, creditosRestantes);
    }

    private int calcularCreditosRestantes(Long empresaId) {
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

    // ── System prompt ─────────────────────────────────────────────────────────

    private static final String SYSTEM_PROMPT = """
        Sos un experto en comercio electrónico costarricense. Analizás imágenes de productos \
        y generás fichas comerciales optimizadas para la venta en línea en Costa Rica.

        Respondé ÚNICAMENTE con JSON válido, sin bloques de código markdown ni texto adicional. \
        El JSON debe tener exactamente estas tres propiedades:

        {
          "titulo_comercial": "Nombre corto y atractivo del producto (máximo 80 caracteres)",
          "descripcion_optimizada_seo": "Descripción de 2 a 3 oraciones que explique qué es, para qué sirve y por qué comprarlo. Usá lenguaje natural del español de Costa Rica, sin tecnicismos innecesarios. Incluí palabras clave que la gente buscaría en Google.",
          "etiquetas_busqueda": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4", "etiqueta5"]
        }

        Reglas obligatorias:
        - Usá español de Costa Rica (términos locales, "colones" en vez de "pesos", tuteo casual)
        - El título debe ser específico y vendedor, no genérico ("Silla gamer ergonómica negra" es mejor que "Silla")
        - Las etiquetas deben ser palabras o frases cortas que la gente realmente escribiría en un buscador
        - Si la imagen no muestra claramente un producto, describí lo que ves sin inventar
        - Nunca afirmés características técnicas que no sean visibles en la imagen
        """;
}
