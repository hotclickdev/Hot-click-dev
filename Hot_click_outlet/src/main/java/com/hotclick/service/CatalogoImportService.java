package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ProductoExtraidoDto;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Extrae productos de URLs (scraping), PDFs y CSVs usando Claude como motor de comprensión.
 */
@Service
public class CatalogoImportService {

    private static final Logger log = LoggerFactory.getLogger(CatalogoImportService.class);

    private static final String ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int    MAX_TOKENS        = 4096;
    private static final int    MAX_TEXT_CHARS    = 14_000;
    private static final int    MAX_PRODUCTOS     = 100;

    private static final Pattern ALLOWED_SCHEMES = Pattern.compile("^https?$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> BLOCKED_HOSTS = Set.of(
        "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"
    );

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private final RestTemplate rest;
    private final ObjectMapper mapper = new ObjectMapper();

    public CatalogoImportService() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(10_000);
        f.setReadTimeout(60_000);
        this.rest = new RestTemplate(f);
    }

    // ── URL ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDeUrl(String rawUrl) throws Exception {
        validarUrl(rawUrl);
        log.info("[import-url] descargando {}", rawUrl);

        Document doc = Jsoup.connect(rawUrl)
            .userAgent("Mozilla/5.0 (compatible; HotClickBot/1.0)")
            .timeout(12_000)
            .get();

        // Eliminar nodos que no aportan contenido textual
        doc.select("script, style, noscript, svg, iframe, header, footer, nav").remove();

        String texto = Jsoup.clean(doc.body().html(), Safelist.none());
        texto = texto.replaceAll("\\s{3,}", "\n").trim();

        return extraerConClaude(truncar(texto), "página web");
    }

    // ── PDF ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDePdf(MultipartFile archivo) throws Exception {
        validarPdf(archivo);
        log.info("[import-pdf] procesando {}", archivo.getOriginalFilename());

        String texto;
        byte[] pdfBytes = archivo.getBytes();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            texto = stripper.getText(pdf);
        }

        return extraerConClaude(truncar(texto.trim()), "catálogo PDF");
    }

    // ── CSV ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDeCsv(MultipartFile archivo) throws Exception {
        validarCsv(archivo);
        log.info("[import-csv] procesando {}", archivo.getOriginalFilename());

        String contenido = new String(archivo.getBytes(), detectarEncoding(archivo.getBytes()));
        return extraerConClaude(truncar(contenido), "archivo CSV");
    }

    // ── Claude ───────────────────────────────────────────────────────────────

    private List<ProductoExtraidoDto> extraerConClaude(String texto, String fuente) throws Exception {
        validarApiKey();

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", "Fuente: " + fuente + "\n\n---\n\n" + texto);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model",      model);
        body.put("max_tokens", MAX_TOKENS);
        body.put("system",     SYSTEM_PROMPT);
        body.put("messages",   List.of(message));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key",        apiKey);
        headers.set("anthropic-version", ANTHROPIC_VERSION);

        String json = mapper.writeValueAsString(body);
        ResponseEntity<String> response = rest.postForEntity(
            ANTHROPIC_URL, new HttpEntity<>(json, headers), String.class);

        JsonNode root    = mapper.readTree(response.getBody());
        String rawText   = root.path("content").get(0).path("text").asText("");

        return parsearRespuesta(rawText);
    }

    private List<ProductoExtraidoDto> parsearRespuesta(String rawText) throws Exception {
        String json = rawText.trim();
        if (json.startsWith("```")) {
            json = json.replaceAll("(?s)^```\\w*\\n?", "")
                       .replaceAll("(?s)```\\s*$", "")
                       .trim();
        }

        // Claude puede devolver objeto con key "productos" o un array directo
        JsonNode node = mapper.readTree(json);
        JsonNode arr  = node.isArray() ? node : node.path("productos");

        if (!arr.isArray()) {
            log.warn("[import] Respuesta inesperada de Claude: {}", json.substring(0, Math.min(200, json.length())));
            return List.of();
        }

        List<ProductoExtraidoDto> resultado = new ArrayList<>();
        for (JsonNode item : arr) {
            if (resultado.size() >= MAX_PRODUCTOS) break;

            String nombre = item.path("nombreProducto").asText("").trim();
            if (nombre.isBlank()) continue;

            ProductoExtraidoDto dto = new ProductoExtraidoDto();
            dto.setNombreProducto(nombre.length() > 200 ? nombre.substring(0, 200) : nombre);
            dto.setPrecioVenta(Math.max(0, item.path("precioVenta").asInt(0)));
            dto.setPrecioCompra(0);
            String desc = item.path("descripcionCorta").asText("").trim();
            dto.setDescripcionCorta(desc.length() > 300 ? desc.substring(0, 300) : desc);
            String img = item.path("imagenPrincipalUrl").asText("").trim();
            dto.setImagenPrincipalUrl(img.isEmpty() || img.equals("null") ? null : img);
            String sku = item.path("sku").asText("").trim();
            dto.setSku(sku.isEmpty() || sku.equals("null") ? null : sku);
            String marca = item.path("marcaTexto").asText("").trim();
            dto.setMarcaTexto(marca.isEmpty() || marca.equals("null") ? null : marca);
            dto.setStockActual(0);

            resultado.add(dto);
        }

        log.info("[import] Extraídos {} productos", resultado.size());
        return resultado;
    }

    // ── Validaciones ──────────────────────────────────────────────────────────

    private void validarApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("El servicio de IA no está configurado en este entorno.");
        }
    }

    private void validarUrl(String rawUrl) throws Exception {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("Ingresá una URL válida.");
        }
        URI uri = URI.create(rawUrl.trim());
        if (!ALLOWED_SCHEMES.matcher(uri.getScheme() != null ? uri.getScheme() : "").matches()) {
            throw new IllegalArgumentException("Solo se permiten URLs http o https.");
        }
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        if (BLOCKED_HOSTS.contains(host) || host.startsWith("192.168.") || host.startsWith("10.")) {
            throw new IllegalArgumentException("URL no permitida.");
        }
    }

    private void validarPdf(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Seleccioná un archivo PDF.");
        }
        if (archivo.getSize() > 30 * 1024 * 1024) {
            throw new IllegalArgumentException("El PDF no puede superar 30 MB.");
        }
        String ct = archivo.getContentType();
        if (ct == null || !ct.contains("pdf")) {
            throw new IllegalArgumentException("El archivo debe ser un PDF.");
        }
    }

    private void validarCsv(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Seleccioná un archivo CSV.");
        }
        if (archivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("El CSV no puede superar 5 MB.");
        }
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    private String truncar(String texto) {
        if (texto == null) return "";
        return texto.length() > MAX_TEXT_CHARS ? texto.substring(0, MAX_TEXT_CHARS) + "\n[... texto truncado ...]" : texto;
    }

    private String detectarEncoding(byte[] bytes) {
        // Detectar BOM UTF-8
        if (bytes.length >= 3 && bytes[0] == (byte) 0xEF && bytes[1] == (byte) 0xBB && bytes[2] == (byte) 0xBF) {
            return "UTF-8";
        }
        return "UTF-8";
    }

    // ── System prompt ─────────────────────────────────────────────────────────

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
        - Si no hay imagen, sku o marca, poné null (no una cadena vacía).
        - Eliminá duplicados.
        - Extraé un máximo de 100 productos.
        - Si no encontrás productos, devolvé un array vacío [].
        - No incluyas categorías, secciones del menú ni elementos que no sean productos individuales.
        """;
}
