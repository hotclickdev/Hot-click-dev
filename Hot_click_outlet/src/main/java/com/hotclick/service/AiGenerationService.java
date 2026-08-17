package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AiProductoGeneradoDTO;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.service.aigeneration.AiGenerationRequestBuilder;
import com.hotclick.service.aigeneration.AiGenerationResponseParser;
import com.hotclick.service.aigeneration.AiGenerationValidator;
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

        AiGenerationValidator.validarApiKey(apiKey);
        AiGenerationValidator.validarImagen(imagen);

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
            String mediaType = AiGenerationValidator.normalizeMediaType(imagen.getContentType());

            Map<String, Object> requestBody = AiGenerationRequestBuilder.buildRequestBody(
                model, MAX_TOKENS, base64, mediaType, categoriaHint, marcaHint);
            ResponseEntity<String> response = callClaude(requestBody);

            JsonNode root        = mapper.readTree(response.getBody());
            int     inputTokens  = root.path("usage").path("input_tokens").asInt(0);
            int     outputTokens = root.path("usage").path("output_tokens").asInt(0);

            // Registra tokens reales; las llamadas ya fueron incrementadas por verificarYReservar
            aiQuotaService.actualizarTokens(empresaId, inputTokens, outputTokens);

            String rawText = root.path("content").get(0).path("text").asText("");
            AiProductoGeneradoDTO dto = AiGenerationResponseParser.parsearRespuesta(
                mapper, sanitizer, aiQuotaService, rawText, empresaId);

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

    private ResponseEntity<String> callClaude(Map<String, Object> body) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key",          apiKey);
        headers.set("anthropic-version",   ANTHROPIC_VERSION);

        String json = mapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(json, headers);

        return rest.postForEntity(ANTHROPIC_URL, entity, String.class);
    }
}
