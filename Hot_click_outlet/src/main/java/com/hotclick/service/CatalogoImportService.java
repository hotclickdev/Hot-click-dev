package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ProductoExtraidoDto;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.Semaphore;
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
    // JSON embebido (Next.js/Nuxt) trae mucha más información útil por carácter que el
    // texto plano de la página (nada de ruido de menú/HTML alrededor) — se le da más margen.
    private static final int    MAX_TEXT_CHARS_JSON = 40_000;
    private static final int    MAX_PRODUCTOS     = 100;

    // PDFs escaneados sin texto se procesan con visión (Claude "lee" la página rasterizada).
    // Cada página cuesta tokens de imagen + tiempo de render/upload — se limita el total de
    // páginas y se agrupan en lotes chicos para no perder toda la respuesta si un lote
    // individual se pasa del límite de MAX_TOKENS de salida (≈4 productos/página observados
    // en catálogos reales, 6 páginas/lote deja margen cómodo bajo 4096 tokens de salida).
    private static final int MAX_PAGINAS_VISION      = 45;
    private static final int PAGINAS_POR_LOTE_VISION = 6;
    private static final int DPI_RENDER_VISION       = 100;

    // Sitios armados con Next.js/Nuxt incrustan el JSON completo de la página (incluyendo
    // el listado de productos ya resuelto en el servidor) en un <script> de hidratación.
    // Ese JSON viaja en el HTML crudo — no requiere ejecutar JavaScript ni navegador headless —
    // pero limpiarHtml() lo descartaría junto con el resto de los <script>. Se busca primero acá.
    private static final List<String> SELECTORES_JSON_HIDRATACION = List.of(
        "script#__NEXT_DATA__", // Next.js
        "script#__NUXT_DATA__"  // Nuxt 3
    );

    private static final Pattern ALLOWED_SCHEMES = Pattern.compile("^https?$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> BLOCKED_HOSTS = Set.of(
        "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"
    );

    @Value("${anthropic.api-key:}")
    private String apiKey;

    @Value("${anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    // Navegador headless — fallback para sitios JS/SPA (Next.js, React, etc.) que
    // Jsoup no puede leer porque el contenido se arma con JavaScript en el navegador.
    // Vacío por defecto: en entornos sin Chromium instalado (ej. dev local en Windows)
    // el fallback simplemente se salta en vez de romper el import por URL.
    @Value("${chrome.bin:}")
    private String chromeBin;

    @Value("${chromedriver.path:}")
    private String chromeDriverPath;

    // Solo una instancia de Chromium a la vez — el servidor (t3.small) tiene RAM justa
    // y esta es una feature de uso ocasional (admin), no necesita paralelismo.
    private static final Semaphore NAVEGADOR_LOCK = new Semaphore(1);
    private static final Duration TIMEOUT_NAVEGADOR = Duration.ofSeconds(20);

    @Autowired
    private SupabaseStorageService storageService;

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

        String html = descargarHtml(rawUrl);
        String jsonProductos = extraerJsonProductosEmbebido(html);

        List<ProductoExtraidoDto> productos;
        if (jsonProductos != null) {
            log.info("[import-url] usando JSON de hidratación embebido: {} chars", jsonProductos.length());
            productos = extraerConClaude(truncar(jsonProductos, MAX_TEXT_CHARS_JSON), "página web (datos JSON embebidos)");
        } else {
            String texto = limpiarHtml(html, rawUrl);
            log.info("[import-url] texto extraído con Jsoup: {} chars", texto.length());
            productos = extraerConClaude(truncar(texto, MAX_TEXT_CHARS), "página web");
        }

        // El largo del texto NO es buen indicador de "hay productos" — un shell vacío de SPA
        // puede tener 300+ chars de solo menú/categorías. La señal confiable es que Claude
        // no haya encontrado nada: ahí vale la pena pagar el costo de renderizar con navegador.
        if (productos.isEmpty() && navegadorDisponible()) {
            log.info("[import-url] 0 productos con la versión simple — probablemente un sitio JS/SPA, " +
                "reintentando con navegador headless");
            try {
                String htmlRenderizado = renderizarConNavegador(rawUrl);
                String textoRenderizado = limpiarHtml(htmlRenderizado, rawUrl);
                log.info("[import-url] texto extraído con navegador: {} chars", textoRenderizado.length());
                List<ProductoExtraidoDto> productosRenderizado =
                    extraerConClaude(truncar(textoRenderizado), "página web (renderizada con navegador)");
                if (!productosRenderizado.isEmpty()) {
                    productos = productosRenderizado;
                }
            } catch (Exception e) {
                log.warn("[import-url] fallback con navegador headless falló: {}", e.getMessage());
                // Seguimos con lo que ya teníamos — mejor algo (o nada limpio) que un 500.
            }
        }

        return productos;
    }

    private String descargarHtml(String rawUrl) throws Exception {
        Document doc = Jsoup.connect(rawUrl)
            .userAgent("Mozilla/5.0 (compatible; HotClickBot/1.0)")
            .timeout(12_000)
            .get();
        return doc.html();
    }

    private String limpiarHtml(String html, String baseUri) {
        Document doc = Jsoup.parse(html, baseUri);
        // Eliminar nodos que no aportan contenido textual
        doc.select("script, style, noscript, svg, iframe, header, footer, nav").remove();

        // Safelist.none() de abajo borra TODAS las etiquetas, incluyendo <img> — sin esto
        // Claude nunca ve las URLs de imagen y por eso no las puede incluir en el resultado.
        // Se deja como marcador de texto junto al producto para que Claude asocie ambos.
        for (org.jsoup.nodes.Element img : doc.select("img[src], img[data-src]")) {
            String src = !img.attr("src").isBlank() ? img.absUrl("src") : img.absUrl("data-src");
            if (!src.isBlank()) {
                img.after("\n[IMAGEN_PRODUCTO: " + src + "]\n");
            }
        }

        String texto = Jsoup.clean(doc.body().html(), Safelist.none());
        return texto.replaceAll("\\s{3,}", "\n").trim();
    }

    /**
     * Busca el <script> de hidratación (Next.js/Nuxt) y, dentro de su JSON, el array que
     * luce como el listado de productos. Devuelve ese array ya serializado (compacto) o
     * null si el sitio no usa este patrón — en ese caso el caller sigue con limpiarHtml().
     */
    private String extraerJsonProductosEmbebido(String html) {
        Document doc = Jsoup.parse(html);
        String jsonCrudo = null;
        for (String selector : SELECTORES_JSON_HIDRATACION) {
            org.jsoup.nodes.Element el = doc.selectFirst(selector);
            if (el != null && !el.data().isBlank()) {
                jsonCrudo = el.data();
                break;
            }
        }
        if (jsonCrudo == null) return null;

        try {
            JsonNode root = mapper.readTree(jsonCrudo);
            List<JsonNode> candidatos = new ArrayList<>();
            recolectarArraysDeProductos(root, 0, candidatos);
            JsonNode mejorCandidato = candidatos.stream()
                .max(Comparator.comparingInt(JsonNode::size))
                .orElse(null);
            if (mejorCandidato == null) return null;

            log.info("[import-url] array de productos encontrado en JSON embebido: {} items", mejorCandidato.size());
            return mapper.writeValueAsString(mejorCandidato);
        } catch (Exception e) {
            log.warn("[import-url] no se pudo interpretar el JSON embebido: {}", e.getMessage());
            return null;
        }
    }

    private void recolectarArraysDeProductos(JsonNode node, int profundidad, List<JsonNode> candidatos) {
        if (node == null || profundidad > 8) return;
        if (node.isArray()) {
            if (node.size() > 0 && node.get(0).isObject() && pareceProducto(node.get(0))) {
                candidatos.add(node);
            }
            for (JsonNode child : node) recolectarArraysDeProductos(child, profundidad + 1, candidatos);
        } else if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> it = node.fields();
            while (it.hasNext()) {
                recolectarArraysDeProductos(it.next().getValue(), profundidad + 1, candidatos);
            }
        }
    }

    // Un objeto "parece producto" si tiene al menos un campo de precio/sku/referencia
    // Y al menos un campo de nombre/descripción — evita falsos positivos con arrays de
    // filtros, categorías o menús que solo calzan con uno de los dos grupos.
    private boolean pareceProducto(JsonNode obj) {
        boolean tienePrecioOSku = false;
        boolean tieneNombre = false;
        Iterator<String> nombresCampo = obj.fieldNames();
        while (nombresCampo.hasNext()) {
            String campo = nombresCampo.next().toLowerCase();
            if (campo.contains("price") || campo.contains("precio") || campo.contains("sku") || campo.contains("reference")) {
                tienePrecioOSku = true;
            }
            if (campo.contains("name") || campo.contains("nombre") || campo.contains("title")
                || campo.contains("description") || campo.contains("descripcion")) {
                tieneNombre = true;
            }
        }
        return tienePrecioOSku && tieneNombre;
    }

    private boolean navegadorDisponible() {
        return chromeBin != null && !chromeBin.isBlank()
            && chromeDriverPath != null && !chromeDriverPath.isBlank();
    }

    /**
     * Renderiza la página con Chromium headless (Alpine) para sitios que arman el
     * contenido con JavaScript (Next.js, React, Vue). Un solo navegador a la vez
     * (NAVEGADOR_LOCK) y cierre garantizado en el finally — evita procesos zombis
     * comiendo RAM en el servidor si algo falla a mitad de camino.
     */
    private String renderizarConNavegador(String url) throws InterruptedException {
        if (!NAVEGADOR_LOCK.tryAcquire(TIMEOUT_NAVEGADOR.getSeconds(), java.util.concurrent.TimeUnit.SECONDS)) {
            throw new IllegalStateException("El navegador headless está ocupado con otra importación, intentá de nuevo en un momento.");
        }
        System.setProperty("webdriver.chrome.driver", chromeDriverPath);

        ChromeOptions options = new ChromeOptions();
        options.setBinary(chromeBin);
        options.addArguments(
            "--headless=new",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
            "--user-agent=Mozilla/5.0 (compatible; HotClickBot/1.0)"
        );
        // EAGER: no esperar a que el evento "load" dispare (algunos sitios nunca lo
        // hacen del todo por analytics/beacons en segundo plano — se probó en vivo
        // contra un sitio real y con NORMAL el navegador quedaba colgado indefinidamente).
        // Con EAGER alcanza con que el DOM esté listo; la hidratación de React/Next
        // se cubre con el sleep de abajo.
        options.setPageLoadStrategy(org.openqa.selenium.PageLoadStrategy.EAGER);

        WebDriver driver = null;
        try {
            driver = new ChromeDriver(options);
            driver.manage().timeouts().pageLoadTimeout(TIMEOUT_NAVEGADOR);
            driver.get(url);
            // Margen para que termine la hidratación de React/Next y cualquier fetch
            // de datos inicial tras el DOM ready.
            Thread.sleep(4_000);
            return driver.getPageSource();
        } finally {
            if (driver != null) {
                try { driver.quit(); } catch (Exception ignored) { /* best-effort cleanup */ }
            }
            NAVEGADOR_LOCK.release();
        }
    }

    // ── PDF ──────────────────────────────────────────────────────────────────

    public List<ProductoExtraidoDto> extraerDePdf(MultipartFile archivo) throws Exception {
        validarPdf(archivo);
        log.info("[import-pdf] procesando {}", archivo.getOriginalFilename());

        String texto;
        int numPaginas;
        byte[] pdfBytes = archivo.getBytes();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            numPaginas = pdf.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            texto = stripper.getText(pdf).trim();
        }

        log.info("[import-pdf] {} páginas, {} chars de texto extraído. Preview: {}",
            numPaginas, texto.length(),
            texto.substring(0, Math.min(200, texto.length())).replace("\n", " "));

        if (!texto.isBlank()) {
            return extraerConClaude(truncar(texto), "catálogo PDF");
        }

        // Sin texto extraíble → probablemente páginas escaneadas/exportadas como imagen.
        // Se intenta "leer" el catálogo con visión antes de rendirse.
        log.info("[import-pdf] sin texto extraíble, se reintenta con visión (páginas rasterizadas)");
        return extraerDePdfEscaneado(pdfBytes, numPaginas);
    }

    /**
     * Rasteriza cada página a imagen y se la manda a Claude directamente — no hay OCR de por
     * medio. Cada página se sube también a S3 y esa URL se pasa como "imagen de referencia":
     * es la página completa, no un recorte del producto individual (los catálogos reales que
     * se probaron componen varios productos en una sola imagen por página, así que recortar
     * por producto no es confiable). El admin puede reemplazar la imagen de cada fila en el
     * paso de revisión si quiere una foto más ajustada.
     */
    private List<ProductoExtraidoDto> extraerDePdfEscaneado(byte[] pdfBytes, int numPaginas) throws Exception {
        int paginasAProcesar = Math.min(numPaginas, MAX_PAGINAS_VISION);
        if (numPaginas > MAX_PAGINAS_VISION) {
            log.warn("[import-pdf] PDF de {} páginas supera el máximo de {} páginas para visión — se procesan solo las primeras",
                numPaginas, MAX_PAGINAS_VISION);
        }

        List<ProductoExtraidoDto> resultado = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(pdf);

            for (int inicio = 0; inicio < paginasAProcesar && resultado.size() < MAX_PRODUCTOS; inicio += PAGINAS_POR_LOTE_VISION) {
                int fin = Math.min(inicio + PAGINAS_POR_LOTE_VISION, paginasAProcesar);
                List<Map<String, Object>> contenido = new ArrayList<>();

                for (int i = inicio; i < fin; i++) {
                    byte[] jpg;
                    try {
                        BufferedImage img = renderer.renderImageWithDPI(i, DPI_RENDER_VISION);
                        jpg = aJpegBytes(img);
                    } catch (Exception e) {
                        log.warn("[import-pdf] no se pudo renderizar página {}: {}", i + 1, e.getMessage());
                        continue;
                    }

                    String urlReferencia = null;
                    try {
                        urlReferencia = storageService.subirImagenBytes(jpg, "jpg", "productos/pdf-import");
                    } catch (Exception e) {
                        log.warn("[import-pdf] no se pudo subir imagen de la página {} a S3: {}", i + 1, e.getMessage());
                    }

                    contenido.add(Map.of("type", "text", "text",
                        "Página " + (i + 1) + " del catálogo" +
                        (urlReferencia != null ? " (imagen de referencia: " + urlReferencia + ")" : "") + ":"));
                    contenido.add(Map.of("type", "image", "source", Map.of(
                        "type", "base64",
                        "media_type", "image/jpeg",
                        "data", Base64.getEncoder().encodeToString(jpg))));
                }

                if (contenido.isEmpty()) continue;

                contenido.add(Map.of("type", "text", "text",
                    "Para cada producto que encuentres, usá como imagenPrincipalUrl la 'imagen de referencia' " +
                    "de la página en la que aparece (te la di arriba de cada imagen) — es la foto de la página " +
                    "completa, no un recorte del producto individual. Si una página no tiene imagen de referencia, poné null."));

                try {
                    List<ProductoExtraidoDto> productosLote = extraerConClaudeVision(contenido);
                    resultado.addAll(productosLote);
                    log.info("[import-pdf] páginas {}-{}: {} productos", inicio + 1, fin, productosLote.size());
                } catch (Exception e) {
                    log.warn("[import-pdf] falló la extracción del lote de páginas {}-{}: {}", inicio + 1, fin, e.getMessage());
                    // Un lote fallido no debe tirar abajo los productos ya extraídos de lotes anteriores.
                }
            }
        }

        if (resultado.isEmpty()) {
            throw new IllegalArgumentException(
                "No se pudieron extraer productos de este PDF escaneado. Probá con el modo URL o CSV.");
        }

        return resultado.size() > MAX_PRODUCTOS ? resultado.subList(0, MAX_PRODUCTOS) : resultado;
    }

    private byte[] aJpegBytes(BufferedImage img) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thumbnails.of(img).scale(1.0).outputQuality(0.85).outputFormat("jpg").toOutputStream(out);
        return out.toByteArray();
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
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", "Fuente: " + fuente + "\n\n---\n\n" + texto);
        return llamarClaude(message);
    }

    // Variante multimodal — el "content" es una lista de bloques texto/imagen en vez de un
    // string plano. Se usa para catálogos PDF escaneados (páginas rasterizadas como imagen).
    private List<ProductoExtraidoDto> extraerConClaudeVision(List<Map<String, Object>> contenido) throws Exception {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", contenido);
        return llamarClaude(message);
    }

    private List<ProductoExtraidoDto> llamarClaude(Map<String, Object> message) throws Exception {
        validarApiKey();

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
        return truncar(texto, MAX_TEXT_CHARS);
    }

    private String truncar(String texto, int limite) {
        if (texto == null) return "";
        return texto.length() > limite ? texto.substring(0, limite) + "\n[... texto truncado ...]" : texto;
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
        - El texto puede tener marcadores "[IMAGEN_PRODUCTO: https://...]" pegados junto al nombre/precio de
          un producto — esa es la URL de su imagen principal. Usá el marcador más cercano al producto (el que
          está inmediatamente antes o después de su nombre/precio) como su imagenPrincipalUrl. No inventes URLs
          de imagen que no vengan de un marcador.
        - Si no hay imagen, sku o marca, poné null (no una cadena vacía).
        - Eliminá duplicados.
        - Extraé un máximo de 100 productos.
        - Si no encontrás productos, devolvé un array vacío [].
        - No incluyas categorías, secciones del menú ni elementos que no sean productos individuales.
        """;
}
