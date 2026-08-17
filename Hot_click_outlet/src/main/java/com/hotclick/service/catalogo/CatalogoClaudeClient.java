package com.hotclick.service.catalogo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ProductoExtraidoDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CatalogoClaudeClient {

    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 4096;

    private static final String SYSTEM_PROMPT = """
        Sos un extractor de catálogos de productos para una tienda en línea costarricense.
        Analizás contenido de páginas web, PDFs o CSVs y extraés la lista de productos.

        Respondé ÚNICAMENTE con un JSON válido — un array de objetos. Sin bloques markdown ni texto adicional.
        Si el contenido tiene una sección de "productos", "catálogo", "inventario" o similar, enfocate en esa sección.

        Cada objeto del array debe tener exactamente estas propiedades:
        {
          "nombreProducto": "nombre completo del producto (máx 200 chars)",
          "precioVenta": 0,
          "descripcionCorta": "descripción breve (máx 300 chars, puede ser cadena vacía)",
          "imagenPrincipalUrl": null,
          "sku": null,
          "marcaTexto": null
        }

        Reglas obligatorias:
        - precioVenta debe ser un entero en colones costarricenses (₡). Si el precio está en dólares, multiplicá por 550. Si no hay precio, poné 0.
        - El texto puede tener marcadores "[IMAGEN_PRODUCTO: https://...]" pegados junto al nombre/precio de
          un producto — esa es la URL de su imagen principal. Usá el marcador más cercano al producto (el que
          está inmediatamente antes o después de su nombre/precio) como su imagenPrincipalUrl. No inventes URLs
          de imagen que no vengan de un marcador. Es preferible imagenPrincipalUrl: null a asignar la imagen de
          OTRO producto — si hay varios marcadores cerca y no está claro cuál corresponde a este producto
          puntual (ej. una grilla con varios productos y fotos intercaladas), dejalo en null en vez de adivinar.
        - Si no hay imagen, sku o marca, poné null (no una cadena vacía).
        - Eliminá duplicados.
        - Extraé un máximo de 100 productos.
        - Si no encontrás productos, devolvé un array vacío [].
        - No incluyas categorías, secciones del menú ni elementos que no sean productos individuales.
        """;

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final RestTemplate rest;
    private final ObjectMapper mapper = new ObjectMapper();
    private final CatalogoClaudeResponseParser responseParser;

    public CatalogoClaudeClient(CatalogoClaudeResponseParser responseParser) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        this.rest = new RestTemplate(factory);
        this.responseParser = responseParser;
    }

    public List<ProductoExtraidoDto> extraerConClaude(String texto, String fuente) throws Exception {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", "Fuente: " + fuente + "\n\n---\n\n" + texto);
        return llamarClaude(message);
    }

    public List<ProductoExtraidoDto> extraerConClaudeVision(List<Map<String, Object>> contenido) throws Exception {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", contenido);
        return llamarClaude(message);
    }

    private List<ProductoExtraidoDto> llamarClaude(Map<String, Object> message) throws Exception {
        validarApiKey();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("max_tokens", MAX_TOKENS);
        body.put("system", SYSTEM_PROMPT);
        body.put("messages", List.of(message));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", ANTHROPIC_VERSION);

        String json = mapper.writeValueAsString(body);
        ResponseEntity<String> response = rest.postForEntity(
            ANTHROPIC_URL, new HttpEntity<>(json, headers), String.class);

        JsonNode root = mapper.readTree(response.getBody());
        String rawText = root.path("content").get(0).path("text").asText("");
        return responseParser.parsearRespuesta(rawText);
    }

    private void validarApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("El servicio de IA no está configurado en este entorno.");
        }
    }
}
