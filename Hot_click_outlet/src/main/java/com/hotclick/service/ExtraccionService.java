package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.GoogleVisionService.VisionResult;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ExtraccionService {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionService.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    // Regex para detectar precios en USD: $12.99 / USD 12.99 / 12,99 USD
    private static final Pattern PRECIO_USD = Pattern.compile(
        "(?:USD|US\\$|\\$)\\s*(\\d{1,6}(?:[.,]\\d{1,2})?)|" +
        "(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*(?:USD|US\\$)"
    );

    private static final String USER_AGENT_DESKTOP =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

    @Autowired
    private BccrService bccrService;
    @Autowired
    private GeminiService geminiService;
    @Autowired
    private ScrapingClient scrapingClient;

    /** Busca precios en ecommerce usando el nombre del producto (sin Vision API). */
    public ResultadoExtraccion extraerPorNombre(String nombreProducto) {
        ResultadoExtraccion resultado = new ResultadoExtraccion();
        resultado.etiquetaPrincipal = nombreProducto;
        resultado.todasEtiquetas = List.of(nombreProducto);
        resultado.tcUsado = bccrService.getTipoCambioVenta();

        String query = nombreProducto.trim().replace(" ", "+");

        List<String> urlsBusqueda = List.of(
            "https://www.amazon.com/s?k=" + query,
            "https://www.ebay.com/sch/i.html?_nkw=" + query,
            "https://www.walmart.com/search?q=" + query,
            "https://www.newegg.com/p/pl?d=" + query
        );

        // Lanzar las 4 URLs en paralelo; timeout global 12s (vs 40s secuencial)
        List<CompletableFuture<PrecioExtraido>> futures = urlsBusqueda.stream()
            .map(url -> CompletableFuture.supplyAsync(
                () -> extraerPrecioDeResultados(url, resultado.tcUsado)))
            .toList();
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(12, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Extraccion parcial o timeout: {}", e.getMessage());
        }
        futures.stream()
            .filter(f -> f.isDone() && !f.isCompletedExceptionally())
            .map(f -> f.join())
            .filter(Objects::nonNull)
            .forEach(resultado.precios::add);

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        } else {
            resultado.error = "No se encontraron precios para \"" + nombreProducto + "\"";
        }
        return resultado;
    }

    private PrecioExtraido extraerPrecioDeResultados(String searchUrl, int tc) {
        Document doc = scrapingClient.fetchDocument(searchUrl, USER_AGENT_DESKTOP, Map.of(
            "Accept-Language", "en-US,en;q=0.9",
            "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        ), 10000);
        if (doc == null) return null;

        // Selectores de precio en páginas de resultados de búsqueda
        String[] selectores = {
            ".a-price .a-offscreen",   // Amazon
            ".s-item__price",           // eBay
            "[itemprop=price]",
            ".price-main",              // Walmart
            ".product-price",
            ".price",
            ".a-price-whole",
        };

        for (String sel : selectores) {
            Element el = doc.selectFirst(sel);
            if (el != null) {
                String texto = el.attr("content").isBlank() ? el.text() : el.attr("content");
                if (!texto.isBlank()) {
                    Integer usd = parsearPrecio(texto);
                    if (usd != null && usd > 0 && usd < 50000) {
                        PrecioExtraido p = new PrecioExtraido();
                        p.fuente = extraerNombreFuente(searchUrl);
                        p.url = searchUrl;
                        p.precioUsd = usd;
                        p.precioCrc = usd * tc;
                        return p;
                    }
                }
            }
        }

        // Fallback: regex en texto completo
        Matcher m = PRECIO_USD.matcher(doc.text());
        if (m.find()) {
            String val = m.group(1) != null ? m.group(1) : m.group(2);
            Integer usd = parsearPrecio(val);
            if (usd != null && usd > 5 && usd < 50000) {
                PrecioExtraido p = new PrecioExtraido();
                p.fuente = extraerNombreFuente(searchUrl);
                p.url = searchUrl;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }

    public ResultadoExtraccion extraer(String imagenBase64, GoogleVisionService vision) {
        VisionResult visionResult = vision.analizar(imagenBase64);
        ResultadoExtraccion resultado = new ResultadoExtraccion();
        resultado.etiquetaPrincipal = visionResult.getEtiquetaPrincipal();
        resultado.todasEtiquetas = visionResult.etiquetas;
        resultado.tcUsado = bccrService.getTipoCambioVenta();

        if (!visionResult.tieneResultados()) {
            resultado.error = "Vision API no identificó el producto";
            return resultado;
        }

        int intentos = 0;
        for (String url : visionResult.urlsEcommerce) {
            if (intentos >= 10) break;
            if (!esUrlEcommerce(url)) continue;
            intentos++;
            PrecioExtraido precio = extraerPrecioDeUrl(url, resultado.tcUsado);
            if (precio != null) {
                resultado.precios.add(precio);
            }
        }

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        }

        return resultado;
    }

    private boolean esUrlEcommerce(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("amazon") || lower.contains("ebay") || lower.contains("walmart") ||
               lower.contains("tiendamia") || lower.contains("encuentra24") || lower.contains("crautos") ||
               lower.contains("linio") || lower.contains("alibaba") || lower.contains("aliexpress") ||
               lower.contains("mercadolibre") || lower.contains("bestbuy") || lower.contains("newegg");
    }

    private PrecioExtraido extraerPrecioDeUrl(String url, int tc) {
        Document doc = scrapingClient.fetchDocument(url, USER_AGENT_DESKTOP, Map.of(
            "Accept-Language", "es-CR,es;q=0.9,en;q=0.8"
        ), 8000);
        if (doc == null) return null;

        // Buscar precio en meta tags og:price
        String precioStr = null;
        Element ogPrice = doc.selectFirst("meta[property=og:price:amount]");
        if (ogPrice != null) precioStr = ogPrice.attr("content");

        // Buscar en selectores comunes de precio
        if (precioStr == null) {
            String[] selectores = {
                "[itemprop=price]", ".a-price .a-offscreen", ".price", "#priceblock_ourprice",
                ".product-price", ".sale-price", "[data-price]", ".current-price"
            };
            for (String sel : selectores) {
                Element el = doc.selectFirst(sel);
                if (el != null) {
                    precioStr = el.attr("content").isBlank() ? el.text() : el.attr("content");
                    if (!precioStr.isBlank()) break;
                }
            }
        }

        // Buscar en texto de la página con regex
        if (precioStr == null) {
            Matcher m = PRECIO_USD.matcher(doc.text());
            if (m.find()) {
                precioStr = m.group(1) != null ? m.group(1) : m.group(2);
            }
        }

        if (precioStr != null && !precioStr.isBlank()) {
            Integer usd = parsearPrecio(precioStr);
            if (usd != null && usd > 0 && usd < 50000) {
                PrecioExtraido p = new PrecioExtraido();
                p.fuente = extraerNombreFuente(url);
                p.url = url;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }

    private Integer parsearPrecio(String texto) {
        try {
            String limpio = texto.replaceAll("[^0-9.,]", "").trim();
            if (limpio.isEmpty()) return null;
            // Normalizar: si tiene coma como decimal (12,99) → 12.99
            if (limpio.matches("\\d+,\\d{2}")) limpio = limpio.replace(",", ".");
            else limpio = limpio.replace(",", "");
            return (int) Double.parseDouble(limpio);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String extraerNombreFuente(String url) {
        try {
            String host = new java.net.URI(url).getHost();
            return host != null ? host.replaceFirst("^www\\.", "") : url;
        } catch (Exception e) {
            return url.length() > 50 ? url.substring(0, 50) : url;
        }
    }

    private int calcularPromedio(List<PrecioExtraido> precios) {
        return (int) precios.stream()
            .mapToInt(p -> p.precioCrc)
            .average()
            .orElse(0);
    }

    /** Analiza una o varias imágenes y devuelve datos completos del producto (fusionando resultados). */
    public DetallesProducto extraerDetallesProducto(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult visionResult = fusionarVisionResults(imagenesBase64, vision);
        return extraerDetallesDeVisionResult(visionResult, imagenesBase64);
    }

    private VisionResult fusionarVisionResults(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult merged = null;
        for (String b64 : imagenesBase64) {
            VisionResult r = vision.analizar(b64);
            // OCR en llamada separada para no interferir con WEB_DETECTION
            String ocr = vision.extraerTextoOcr(b64);
            if (!ocr.isBlank()) r.textoOcr = ocr;

            if (merged == null) {
                merged = r;
            } else {
                for (String etiqueta : r.etiquetas)
                    if (!merged.etiquetas.contains(etiqueta)) merged.etiquetas.add(etiqueta);
                for (String url : r.urlsEcommerce)
                    if (!merged.urlsEcommerce.contains(url)) merged.urlsEcommerce.add(url);
                for (GoogleVisionService.WebEntity we : r.webEntities)
                    if (merged.webEntities.stream().noneMatch(e -> e.description.equals(we.description)))
                        merged.webEntities.add(we);
                for (String lf : r.labelsFisicos)
                    if (!merged.labelsFisicos.contains(lf)) merged.labelsFisicos.add(lf);
                if (!r.textoOcr.isBlank()) {
                    merged.textoOcr = merged.textoOcr.isBlank()
                        ? r.textoOcr
                        : merged.textoOcr + "\n---\n" + r.textoOcr;
                }
            }
        }
        return merged != null ? merged : new VisionResult();
    }

    private DetallesProducto extraerDetallesDeVisionResult(VisionResult visionResult, List<String> imagenesBase64) {
        DetallesProducto d = new DetallesProducto();
        d.tcUsado = bccrService.getTipoCambioVenta();

        // Nombre: webEntity de alto score → categoría física → null (se llenará más adelante)
        String nombrePrincipal = visionResult.getEtiquetaPrincipal();
        if (nombrePrincipal == null || nombrePrincipal.endsWith("?"))
            nombrePrincipal = visionResult.getCategoriaFisica();
        d.nombre = nombrePrincipal;
        d.todasEtiquetas = new ArrayList<>(visionResult.etiquetas);

        // ── 0. Gemini AI: análisis directo de la imagen (más preciso que scraping) ─
        boolean geminiCompleto = false;
        try {
            GeminiService.ProductoIA ia = geminiService.analizarProducto(imagenesBase64);
            if (ia != null) {
                // Validar nombre de Gemini: si Vision identificó etiquetas, el nombre
                // de Gemini debe ser coherente con ellas. Si no lo es, preferir la etiqueta de Vision.
                if (ia.nombre != null) {
                    boolean nombreCoherente = d.todasEtiquetas.isEmpty() ||
                        d.todasEtiquetas.stream().anyMatch(e ->
                            ia.nombre.toLowerCase().contains(e.toLowerCase().split(" ")[0]) ||
                            e.toLowerCase().contains(ia.nombre.toLowerCase().split(" ")[0])
                        );
                    if (nombreCoherente) {
                        d.nombre = ia.nombre;
                    } else if (d.nombre == null) {
                        // Gemini tiene nombre pero no es coherente con Vision — usar Vision
                        d.nombre = visionResult.getEtiquetaPrincipal();
                        log.info("Nombre Gemini '{}' no coincide con etiquetas Vision, usando: {}", ia.nombre, d.nombre);
                    }
                }
                if (ia.marca           != null) d.marca           = ia.marca;
                if (ia.descripcionCorta != null) d.descripcionCorta = ia.descripcionCorta;
                if (ia.especificaciones != null) d.especificaciones = ia.especificaciones;
                if (ia.comoUsar        != null) d.comoUsar        = ia.comoUsar;
                geminiCompleto = d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null;
                log.info("Gemini: nombre={}, completo={}", d.nombre, geminiCompleto);
            }
        } catch (Exception e) {
            log.warn("Gemini falló, usando fallbacks: {}", e.getMessage());
        }

        // ── 1-2. OCR y scraping: solo si Gemini no completó todos los campos ───────
        if (!geminiCompleto) {
            DetallesProducto ocr = extraerDetallesDeOcr(visionResult.textoOcr);
            if (ocr != null) {
                if (ocr.descripcionCorta != null && d.descripcionCorta == null) d.descripcionCorta = ocr.descripcionCorta;
                if (ocr.especificaciones  != null && d.especificaciones  == null) d.especificaciones  = ocr.especificaciones;
                if (ocr.comoUsar          != null && d.comoUsar          == null) d.comoUsar          = ocr.comoUsar;
            }
            if (d.nombre == null && !visionResult.textoOcr.isBlank()) {
                d.nombre = Arrays.stream(visionResult.textoOcr.split("\n"))
                    .map(String::trim)
                    .filter(l -> l.length() > 4 && l.length() < 60
                        && !l.matches("(?i)^(ingredients?|nutrition|directions?|contenido|ingredientes|"
                            + "warnings?|caution|cantidad|net weight|peso neto|www\\..*).*"))
                    .findFirst().orElse(null);
            }

            // Scraping de páginas de producto (solo si Gemini no completó)
            for (String url : visionResult.urlsEcommerce) {
                if (!esUrlEcommerce(url)) continue;
                if (esPaginaDeResultados(url)) continue;
                if (d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null) break;
                DetallesProducto scraped = extraerDetallesDeUrl(url);
                if (scraped != null) {
                    if (scraped.nombre != null && !scraped.nombre.isBlank() && d.nombre == null) d.nombre = scraped.nombre;
                    if (d.descripcionCorta == null) d.descripcionCorta = scraped.descripcionCorta;
                    if (d.descripcionLarga == null) d.descripcionLarga = scraped.descripcionLarga;
                    if (d.especificaciones == null) d.especificaciones = scraped.especificaciones;
                    if (d.comoUsar         == null) d.comoUsar         = scraped.comoUsar;
                    if (d.marca            == null) d.marca            = scraped.marca;
                    if (d.fuenteDetalles   == null) d.fuenteDetalles   = scraped.fuenteDetalles;
                }
            }
        }

        // ── 3. Extraer precios de hasta 8 URLs ───────────────────────────────────
        int intentos = 0;
        for (String url : visionResult.urlsEcommerce) {
            if (intentos >= 8) break;
            if (!esUrlEcommerce(url)) continue;
            intentos++;
            PrecioExtraido precio = extraerPrecioDeUrl(url, d.tcUsado);
            if (precio != null) d.precios.add(precio);
        }
        if (!d.precios.isEmpty()) {
            d.promedioCrc = calcularPromedio(d.precios);
            d.precioSugerido = (int)(d.promedioCrc * 1.13 * 1.25 * 1.20);
        }

        // ── 4 y 4.5. Búsquedas por nombre/web: solo si Gemini no completó ──────────
        if (!geminiCompleto) {
            String terminoBusqueda = d.nombre;
            if (terminoBusqueda == null && !d.todasEtiquetas.isEmpty())
                terminoBusqueda = d.todasEtiquetas.get(0);
            if (terminoBusqueda == null && !visionResult.labelsFisicos.isEmpty())
                terminoBusqueda = visionResult.labelsFisicos.get(0);

            if (d.descripcionCorta == null && terminoBusqueda != null)
                d.descripcionCorta = buscarDescripcionPorNombre(terminoBusqueda);
            if (d.especificaciones == null && terminoBusqueda != null)
                d.especificaciones = buscarEspecificacionesPorNombre(terminoBusqueda);

            boolean faltaCampo = d.descripcionCorta == null || d.especificaciones == null || d.comoUsar == null;
            boolean tieneBase  = terminoBusqueda != null || !visionResult.labelsFisicos.isEmpty();
            if (faltaCampo && tieneBase) {
                String baseSearch = terminoBusqueda != null ? terminoBusqueda
                    : visionResult.labelsFisicos.get(0);
                List<String> webUrls = buscarUrlsProductoEnWeb(baseSearch, d.todasEtiquetas);
                for (String url : webUrls) {
                    if (d.descripcionCorta != null && d.especificaciones != null && d.comoUsar != null) break;
                    DetallesProducto scraped = extraerDetallesDeUrl(url);
                    if (scraped != null) {
                        if (d.descripcionCorta == null) d.descripcionCorta = scraped.descripcionCorta;
                        if (d.descripcionLarga == null) d.descripcionLarga = scraped.descripcionLarga;
                        if (d.especificaciones == null) d.especificaciones = scraped.especificaciones;
                        if (d.comoUsar         == null) d.comoUsar         = scraped.comoUsar;
                        if (d.marca            == null) d.marca            = scraped.marca;
                        if (d.fuenteDetalles   == null) d.fuenteDetalles   = scraped.fuenteDetalles;
                    }
                }
            }
        }

        // ── 5. Garantía final: los tres campos siempre tienen texto ──────────────
        // Combinar todas las señales disponibles para los generadores
        List<String> todasSeñales = new ArrayList<>(d.todasEtiquetas);
        visionResult.labelsFisicos.forEach(l -> { if (!todasSeñales.contains(l)) todasSeñales.add(l); });
        String nombreFinal = d.nombre != null ? d.nombre
            : (!todasSeñales.isEmpty() ? todasSeñales.get(0) : null);

        if (d.descripcionCorta == null)
            d.descripcionCorta = construirDescripcionDeEtiquetas(nombreFinal, todasSeñales);
        if (d.especificaciones == null)
            d.especificaciones = construirEspecificacionesDeLabels(nombreFinal, visionResult.labelsFisicos, todasSeñales);
        if (d.comoUsar == null)
            d.comoUsar = generarComoUsar(nombreFinal, todasSeñales);

        // Truncar respetando los límites del formulario
        if (d.nombre == null) d.nombre = nombreFinal;
        d.nombre           = truncar(d.nombre, 80);
        d.titulo           = truncar(d.nombre, 40);
        d.descripcionCorta = truncar(limpiarDescripcion(d.descripcionCorta), 200);
        d.especificaciones = truncar(d.especificaciones, 500);
        d.comoUsar         = truncar(d.comoUsar, 150);
        d.marca            = truncar(d.marca, 98);
        return d;
    }

    /** Detecta URLs de páginas de resultados de búsqueda (no páginas de producto). */
    private boolean esPaginaDeResultados(String url) {
        if (url == null) return true;
        String lower = url.toLowerCase();
        return lower.contains("/s?") || lower.contains("/search") || lower.contains("?q=") ||
               lower.contains("?k=") || lower.contains("?st=") || lower.contains("_nkw=") ||
               lower.contains("/pl?") || lower.contains("?d=") || lower.contains("/sch/");
    }

    /** Filtra texto genérico de ecommerce que no describe el producto. */
    private String limpiarDescripcion(String desc) {
        if (desc == null || desc.isBlank()) return null;
        String lower = desc.toLowerCase();
        if (lower.startsWith("search ") || lower.startsWith("shop ") ||
            lower.contains("fast shipping") || lower.contains("free returns") ||
            lower.contains("top-rated customer") || lower.contains("great prices") ||
            lower.contains("find the best") || lower.contains("browse our") ||
            desc.length() < 20) {
            return null;
        }
        return desc;
    }

    private String buscarDescripcionPorNombre(String nombre) {
        // ── 1. DuckDuckGo Instant Answer (rápido, sin scraping) ──────────────────
        String ddg = buscarEnDuckDuckGo(nombre);
        if (ddg != null) return ddg;

        // ── 2. Búsqueda en webs de ecommerce ─────────────────────────────────────
        String query = nombre.trim().replace(" ", "+");
        String[] urls = {
            "https://www.newegg.com/p/pl?d=" + query,
            "https://www.bestbuy.com/site/searchpage.jsp?st=" + query,
            "https://www.walmart.com/search?q=" + query,
        };
        for (String url : urls) {
            Document doc = scrapingClient.fetchDocument(url, USER_AGENT_DESKTOP,
                Map.of("Accept-Language", "en-US,en;q=0.9"), 8000);
            if (doc == null) continue;
            Element meta = doc.selectFirst("meta[name=description], meta[property=og:description]");
            if (meta != null) {
                String content = meta.attr("content").trim();
                if (content.length() > 30) return content;
            }
            for (String sel : new String[]{".item-description", ".product-description", ".short-description", "[data-testid=description]"}) {
                Element el = doc.selectFirst(sel);
                if (el != null && !el.text().isBlank()) return el.text().trim();
            }
        }
        return null;
    }

    /** Consulta DuckDuckGo Instant Answer API. Sin API key. Devuelve null si no hay resultado. */
    private String buscarEnDuckDuckGo(String query) {
        String enc = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String json = scrapingClient.fetchBody(
            "https://api.duckduckgo.com/?q=" + enc + "&format=json&no_html=1&skip_disambig=1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 8000);
        if (json == null) return null;
        try {
            JsonNode root = JSON.readTree(json);
            String text = root.path("AbstractText").asText("").trim();
            if (text.length() > 50) return text;
        } catch (Exception e) {
            log.debug("DuckDuckGo instant answer: respuesta no parseable para '{}': {}", query, e.getMessage());
        }
        return null;
    }

    /** Busca páginas de producto en DuckDuckGo y devuelve hasta 4 URLs directas. */
    private List<String> buscarUrlsProductoEnWeb(String nombre, List<String> etiquetas) {
        List<String> urls = new ArrayList<>();
        String base = (nombre != null && !nombre.isBlank())
            ? nombre
            : (etiquetas.isEmpty() ? "" : etiquetas.get(0));
        if (base.isBlank()) return urls;
        String enc = URLEncoder.encode(base + " product specifications review", StandardCharsets.UTF_8);
        Document doc = scrapingClient.fetchDocument("https://html.duckduckgo.com/html/?q=" + enc, USER_AGENT_DESKTOP,
            Map.of("Accept-Language", "en-US,en;q=0.9", "Referer", "https://duckduckgo.com"), 12000);
        if (doc == null) return urls;

        for (Element a : doc.select("a.result__a, h2.result__title a")) {
            String href = a.attr("href");
            // DDG encodes la URL real en el parámetro uddg=
            if (href.contains("uddg=")) {
                try {
                    int i = href.indexOf("uddg=") + 5;
                    int end = href.indexOf("&", i);
                    href = URLDecoder.decode(end > i ? href.substring(i, end) : href.substring(i), StandardCharsets.UTF_8);
                } catch (Exception e) { log.debug("url decode error: {}", e.getMessage()); }
            }
            if (href.startsWith("http") && !href.contains("duckduckgo.com") && !esPaginaDeResultados(href)) {
                urls.add(href);
                if (urls.size() >= 4) break;
            }
        }
        return urls;
    }

    /** Extrae datos de JSON-LD schema.org (Product, HowTo) del documento HTML. */
    private void extraerDeJsonLD(Document doc, DetallesProducto d) {
        for (Element script : doc.select("script[type=application/ld+json]")) {
            try {
                JsonNode root = JSON.readTree(script.html());
                if (root.isObject() && root.has("@graph")) root = root.get("@graph");
                if (root.isArray()) {
                    for (JsonNode node : root) aplicarSchema(node, d);
                } else {
                    aplicarSchema(root, d);
                }
            } catch (Exception e) { log.debug("json-ld parse error: {}", e.getMessage()); }
        }
    }

    private void aplicarSchema(JsonNode node, DetallesProducto d) {
        String type = node.path("@type").asText("");
        if (type.contains("Product")) {
            if (d.nombre == null || d.nombre.isBlank()) {
                String n = node.path("name").asText("").trim();
                if (!n.isBlank()) d.nombre = n;
            }
            if (d.descripcionCorta == null) {
                String desc = node.path("description").asText("").trim();
                if (desc.length() > 20) d.descripcionCorta = desc;
            }
            if (d.marca == null) {
                JsonNode brand = node.path("brand");
                String bn = brand.isObject() ? brand.path("name").asText("") : brand.asText("");
                if (!bn.isBlank()) d.marca = bn.trim();
            }
            if (d.especificaciones == null) {
                JsonNode props = node.path("additionalProperty");
                if (props.isArray() && props.size() > 0) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode p : props) {
                        String k = p.path("name").asText("").trim();
                        String v = p.path("value").asText("").trim();
                        if (!k.isBlank() && !v.isBlank()) sb.append(k).append(": ").append(v).append("\n");
                        if (sb.length() > 450) break;
                    }
                    if (sb.length() > 0) d.especificaciones = sb.toString().trim();
                }
            }
        } else if (type.contains("HowTo")) {
            if (d.comoUsar == null) {
                JsonNode steps = node.path("step");
                if (steps.isArray()) {
                    List<String> texts = new ArrayList<>();
                    for (JsonNode s : steps) {
                        String t = s.path("text").asText(s.path("name").asText("")).trim();
                        if (!t.isBlank()) texts.add(t);
                        if (texts.size() >= 3) break;
                    }
                    if (!texts.isEmpty()) d.comoUsar = String.join(" ", texts);
                }
            }
        }
    }

    private String buscarEspecificacionesPorNombre(String nombre) {
        String query = nombre.trim().replace(" ", "+");
        Document doc = scrapingClient.fetchDocument("https://www.newegg.com/p/pl?d=" + query, USER_AGENT_DESKTOP,
            Map.of(), 8000);
        if (doc == null) return null;
        // Buscar primer link de producto y scrapearlo
        Element productLink = doc.selectFirst("a.item-title");
        if (productLink != null) {
            String productUrl = productLink.attr("abs:href");
            if (!productUrl.isBlank()) {
                DetallesProducto d2 = extraerDetallesDeUrl(productUrl);
                if (d2 != null && d2.especificaciones != null) return d2.especificaciones;
            }
        }
        return null;
    }

    private DetallesProducto extraerDetallesDeUrl(String url) {
        Document doc = scrapingClient.fetchDocument(url, USER_AGENT_DESKTOP, Map.of(
            "Accept-Language", "en-US,en;q=0.9",
            "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        ), 10000);
        if (doc == null) return null;

        try {
            DetallesProducto d = new DetallesProducto();
            d.fuenteDetalles = extraerNombreFuente(url);

            // JSON-LD schema.org (más fiable que selectores CSS)
            extraerDeJsonLD(doc, d);

            // Nombre
            for (String sel : new String[]{"#productTitle", ".x-item-title__mainTitle span", "h1[itemprop=name]", "h1"}) {
                Element el = doc.selectFirst(sel);
                if (el != null && !el.text().isBlank()) { d.nombre = el.text().trim(); break; }
            }

            // Feature bullets de Amazon → descripción corta (3 más útiles, en una sola línea)
            Elements bullets = doc.select("#feature-bullets .a-list-item, #feature-bullets li");
            if (!bullets.isEmpty()) {
                List<String> utiles = new ArrayList<>();
                for (Element b : bullets) {
                    String t = b.text().trim();
                    if (t.isBlank() || t.length() < 15) continue;
                    String tl = t.toLowerCase();
                    if (tl.contains("make sure") || tl.contains("click here") ||
                        tl.contains("warranty") || tl.contains("garantía") ||
                        tl.contains("customer service") || tl.contains("free return")) continue;
                    utiles.add(t.length() > 70 ? t.substring(0, 70) : t);
                    if (utiles.size() == 3) break;
                }
                if (!utiles.isEmpty()) d.descripcionCorta = String.join(". ", utiles);
            }

            // Meta description como fallback (solo si es descripción de producto, no de búsqueda)
            if (d.descripcionCorta == null) {
                Element meta = doc.selectFirst("meta[name=description], meta[property=og:description]");
                if (meta != null) {
                    String content = meta.attr("content").trim();
                    if (!content.isBlank() && content.length() > 20) {
                        String cl = content.toLowerCase();
                        if (!cl.startsWith("search ") && !cl.startsWith("shop ") && !cl.contains("fast shipping"))
                            d.descripcionCorta = content;
                    }
                }
            }

            // Descripción larga
            for (String sel : new String[]{"#productDescription p", ".product-description p", "[itemprop=description]"}) {
                Element el = doc.selectFirst(sel);
                if (el != null && !el.text().isBlank()) { d.descripcionLarga = el.text().trim(); break; }
            }

            // Tabla de especificaciones técnicas (Amazon y otros)
            Elements rows = doc.select(
                "#technicalSpecifications_section_1 tr, #productDetails_techSpec_section_1 tr, .a-normal.a-spacing-micro tr");
            if (!rows.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (Element row : rows) {
                    Elements cells = row.select("td, th");
                    if (cells.size() >= 2) {
                        String k = cells.get(0).text().trim(), v = cells.get(1).text().trim();
                        if (!k.isBlank() && !v.isBlank()) sb.append(k).append(": ").append(v).append("\n");
                    }
                }
                if (sb.length() > 0) d.especificaciones = sb.toString().trim();
            }

            // Marca
            Element brandEl = doc.selectFirst("#bylineInfo, [itemprop=brand], .brand-name");
            if (brandEl != null) {
                String brand = brandEl.text().replaceAll("(?i)^(brand:|by |marca:)\\s*", "").trim();
                d.marca = brand.length() > 100 ? brand.substring(0, 100) : brand;
            }

            // Cómo usar / Directions
            for (String sel : new String[]{
                "#directions", ".directions", ".how-to-use", "#how-to-use",
                ".usage-instructions", ".product-usage", "[data-feature-name='directions']",
                ".directions-content", ".modo-de-uso", ".instrucciones-uso"
            }) {
                Element el = doc.selectFirst(sel);
                if (el != null && el.text().length() > 15) { d.comoUsar = el.text().trim(); break; }
            }
            if (d.comoUsar == null) {
                for (Element el : doc.select("p, li")) {
                    String text = el.ownText().trim();
                    String lower = text.toLowerCase();
                    if (text.length() > 20 && text.length() < 400 &&
                        (lower.startsWith("directions:") || lower.startsWith("how to use:") ||
                         lower.startsWith("modo de uso:") || lower.startsWith("instrucciones:") ||
                         lower.startsWith("how to apply:"))) {
                        d.comoUsar = text;
                        break;
                    }
                }
            }

            if (d.nombre != null || d.descripcionCorta != null) return d;
        } catch (Exception e) {
            log.debug("No se pudieron extraer detalles de {}: {}", url, e.getMessage());
        }
        return null;
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private String generarComoUsar(String nombre, List<String> etiquetas) {
        String ctx = (nombre != null ? nombre.toLowerCase() : "") + " " +
                     (etiquetas != null ? String.join(" ", etiquetas).toLowerCase() : "");
        if (ctx.contains("crema") || ctx.contains("serum") || ctx.contains("moisturizer") ||
            ctx.contains("skincare") || ctx.contains("lotion") || ctx.contains("toner") ||
            ctx.contains("cleanser") || ctx.contains("face cream") || ctx.contains("skin care")) {
            return "Aplicar en rostro y cuello con piel limpia. Masajear en círculos hasta absorber. Usar mañana y noche.";
        }
        if (ctx.contains("perfume") || ctx.contains("cologne") || ctx.contains("fragrance") ||
            ctx.contains("eau de") || ctx.contains("parfum")) {
            return "Aplicar en puntos de calor: cuello, muñecas e interior de codos. No frotar tras aplicar.";
        }
        if (ctx.contains("shampoo") || ctx.contains("conditioner") || ctx.contains("acondicionador") ||
            ctx.contains("cabello") || ctx.contains("hair mask") || ctx.contains("mascarilla capilar")) {
            return "Aplicar en cabello húmedo, masajear y enjuagar bien. Usar acondicionador de medios a puntas.";
        }
        if (ctx.contains("supplement") || ctx.contains("vitamin") || ctx.contains("capsule") ||
            ctx.contains("tablet") || ctx.contains("suplemento") || ctx.contains("vitamina") ||
            ctx.contains("proteina") || ctx.contains("protein") || ctx.contains("collagen") ||
            ctx.contains("colageno")) {
            return "Tomar según indicación del empaque, preferiblemente con alimentos. No exceder la dosis diaria recomendada.";
        }
        if (ctx.contains("charger") || ctx.contains("cargador") || ctx.contains("cable") ||
            ctx.contains("adapter") || ctx.contains("adaptador") || ctx.contains("power bank") ||
            ctx.contains("batería portátil")) {
            return "Conectar el cable al dispositivo y luego a la fuente de energía. Verificar compatibilidad de voltaje y conector.";
        }
        if (ctx.contains("headphone") || ctx.contains("auricular") || ctx.contains("earphone") ||
            ctx.contains("earbuds") || ctx.contains("audífono")) {
            return "Encender y activar modo pairing. Seleccionar el dispositivo desde ajustes Bluetooth. Ajustar el volumen gradualmente.";
        }
        if (ctx.contains("speaker") || ctx.contains("bocina") || ctx.contains("altavoz") ||
            ctx.contains("parlante")) {
            return "Encender y activar Bluetooth. Emparejar desde ajustes del dispositivo. Mantener alejado del agua salvo que sea resistente.";
        }
        if (ctx.contains("smartwatch") || ctx.contains("smart watch") || ctx.contains("wearable") ||
            ctx.contains("fitness band") || ctx.contains("reloj inteligente")) {
            return "Ajustar la correa a la muñeca. Instalar la app del fabricante y emparejar vía Bluetooth para sincronizar datos.";
        }
        if (ctx.contains("phone") || ctx.contains("celular") || ctx.contains("smartphone") ||
            ctx.contains("iphone") || ctx.contains("android")) {
            return "Insertar tarjeta SIM y encender. Seguir el asistente de configuración inicial. Cargar completamente antes del primer uso.";
        }
        if (ctx.contains("tablet") || ctx.contains("laptop") || ctx.contains("computer") ||
            ctx.contains("notebook") || ctx.contains("computadora")) {
            return "Cargar completamente antes del primer uso. Seguir la configuración inicial en pantalla. Mantener el software actualizado.";
        }
        if (ctx.contains("tenis") || ctx.contains("zapato") || ctx.contains("shoe") ||
            ctx.contains("sneaker") || ctx.contains("boot") || ctx.contains("bota") ||
            ctx.contains("sandal") || ctx.contains("sandalia")) {
            return "Usar con calcetines adecuados. Limpiar con paño húmedo tras el uso. No lavar a máquina ni sumergir en agua.";
        }
        if (ctx.contains("ropa") || ctx.contains("camisa") || ctx.contains("pantalon") ||
            ctx.contains("vestido") || ctx.contains("shirt") || ctx.contains("dress") ||
            ctx.contains("jacket") || ctx.contains("pants") || ctx.contains("jeans") ||
            ctx.contains("chaqueta") || ctx.contains("abrigo")) {
            return "Lavar a mano o en ciclo delicado según la etiqueta. No usar blanqueador. Planchar a la temperatura indicada.";
        }
        if (ctx.contains("bag") || ctx.contains("bolso") || ctx.contains("mochila") ||
            ctx.contains("backpack") || ctx.contains("wallet") || ctx.contains("cartera")) {
            return "Limpiar con paño húmedo. Guardar en bolsa de tela cuando no se use. Evitar exposición prolongada a la humedad.";
        }
        if (ctx.contains("toy") || ctx.contains("juguete") || ctx.contains("game") ||
            ctx.contains("juego") || ctx.contains("puzzle") || ctx.contains("doll")) {
            return "Usar bajo supervisión adulta para niños menores de 3 años. Guardar piezas pequeñas fuera del alcance de bebés.";
        }
        if (ctx.contains("kitchen") || ctx.contains("cocina") || ctx.contains("cookware") ||
            ctx.contains("olla") || ctx.contains("sarten") || ctx.contains("pot ") ||
            ctx.contains("pan ") || ctx.contains("utensilios")) {
            return "Lavar antes del primer uso. No usar utensilios metálicos en superficies antiadherentes. Verificar si es apto para lavavajillas.";
        }
        if (ctx.contains("food") || ctx.contains("snack") || ctx.contains("alimento") ||
            ctx.contains("comida") || ctx.contains("bebida") || ctx.contains("drink") ||
            ctx.contains("juice") || ctx.contains("jugo")) {
            return "Consumir antes de la fecha indicada en el empaque. Mantener refrigerado tras abrir si aplica.";
        }
        return "Usar según las indicaciones del fabricante en el empaque. Guardar en lugar fresco y seco, lejos del alcance de niños.";
    }

    /** Construye una descripción corta usando el nombre y las etiquetas de Vision. Nunca devuelve null. */
    private String construirDescripcionDeEtiquetas(String nombre, List<String> etiquetas) {
        final String base;
        if (nombre == null || nombre.isBlank()) {
            if (!etiquetas.isEmpty()) {
                base = etiquetas.get(0);
            } else {
                return "Producto importado de calidad. Ver imágenes para más detalles.";
            }
        } else {
            base = nombre;
        }
        List<String> extras = etiquetas.stream()
            .filter(e -> !e.equalsIgnoreCase(base) && e.length() > 3)
            .limit(3)
            .collect(Collectors.toList());
        if (extras.isEmpty()) return base + ".";
        return base + ". " + String.join(", ", extras) + ".";
    }

    /** Construye especificaciones básicas usando los datos de Vision. Nunca devuelve null. */
    private String construirEspecificacionesDeLabels(String nombre, List<String> labelsFisicos, List<String> etiquetas) {
        StringBuilder sb = new StringBuilder();
        if (nombre != null && !nombre.isBlank())
            sb.append("Producto: ").append(nombre).append("\n");
        if (!labelsFisicos.isEmpty())
            sb.append("Categoría: ").append(labelsFisicos.get(0)).append("\n");
        // Etiquetas que parezcan características (contienen espacio o número)
        etiquetas.stream()
            .filter(e -> e.length() > 4 && (e.contains(" ") || e.matches(".*\\d.*")))
            .limit(4)
            .forEach(e -> sb.append("Característica: ").append(e).append("\n"));
        // Si no tenemos nada útil, devolver plantilla para completar manualmente
        if (sb.length() < 15)
            return "Marca: \nModelo: \nMaterial: \nColor: \nDimensiones: ";
        return sb.toString().trim();
    }

    /**
     * Extrae descripcionCorta, especificaciones y comoUsar directamente del texto OCR
     * de las imágenes del producto (texto visible en empaque, etiqueta, caja).
     */
    private DetallesProducto extraerDetallesDeOcr(String ocrText) {
        if (ocrText == null || ocrText.isBlank()) return null;

        List<String> lines = Arrays.stream(ocrText.split("\n"))
            .map(String::trim)
            .filter(l -> !l.isBlank())
            .collect(Collectors.toList());
        if (lines.isEmpty()) return null;

        DetallesProducto d = new DetallesProducto();

        // ── Cómo usar: buscar sección con cabecera de instrucciones ──────────────
        Pattern headerInstr = Pattern.compile(
            "(?i)^(how\\s+to\\s+(use|apply)|directions?|instrucciones?|"
            + "modo\\s+de\\s+(uso|empleo)|c[oó]mo\\s+usar|application|"
            + "usage|use:?|how\\s+to\\s+use:?)\\s*$"
        );
        int instrStart = -1;
        for (int i = 0; i < lines.size(); i++) {
            if (headerInstr.matcher(lines.get(i)).matches()) { instrStart = i + 1; break; }
        }
        if (instrStart >= 0 && instrStart < lines.size()) {
            List<String> instrLines = new ArrayList<>();
            for (int i = instrStart; i < lines.size() && instrLines.size() < 4; i++) {
                String line = lines.get(i);
                // Parar al encontrar siguiente sección (cabecera en mayúsculas o termina en ":")
                if (line.length() < 35 && (line.equals(line.toUpperCase()) || line.endsWith(":"))) break;
                instrLines.add(line);
            }
            if (!instrLines.isEmpty()) d.comoUsar = String.join(" ", instrLines);
        }

        // ── Especificaciones: líneas "Clave: Valor" o con unidades técnicas ──────
        Pattern specKV  = Pattern.compile("^[\\w\\s]{2,25}:\\s+.{2,}");
        Pattern techUnit = Pattern.compile(
            "(?i)\\d+\\s*(mah|wh|w\\b|v\\b|a\\b|ghz|mhz|db|g\\b|kg|oz|ml\\b|l\\b|cm|mm|m\\b|in\\b|ft|"
            + "hrs?|hours?|horas?|%|fps|rpm|mp\\b|px|x\\d+)");
        List<String> specLines = new ArrayList<>();
        for (String line : lines) {
            boolean isSpec = specKV.matcher(line).find() || techUnit.matcher(line).find();
            if (!isSpec) continue;
            String ll = line.toLowerCase();
            // Excluir líneas de instrucciones que también tengan números
            if (ll.startsWith("apply") || ll.startsWith("use ") || ll.startsWith("take ")
                || ll.startsWith("store") || ll.startsWith("keep ") || ll.startsWith("do not")
                || ll.startsWith("aplicar") || ll.startsWith("usar") || ll.startsWith("tomar")
                || ll.startsWith("guardar") || ll.startsWith("evitar")) continue;
            specLines.add(line);
            if (specLines.size() >= 12) break;
        }
        if (!specLines.isEmpty()) d.especificaciones = String.join("\n", specLines);

        // ── Descripción corta: primeras líneas sustantivas (no headers ni specs) ─
        List<String> descLines = new ArrayList<>();
        for (String line : lines) {
            if (line.length() < 20) continue;
            // Saltar cabeceras en ALL CAPS
            if (line.equals(line.toUpperCase()) && line.replaceAll("[^A-Z]", "").length() > 5) continue;
            // Saltar líneas que ya son specs
            if (specKV.matcher(line).find()) continue;
            // Saltar líneas de instrucciones
            String ll = line.toLowerCase();
            if (ll.startsWith("apply") || ll.startsWith("use ") || ll.startsWith("aplicar")) continue;
            descLines.add(line);
            if (descLines.size() >= 2) break;
        }
        if (!descLines.isEmpty()) {
            String desc = String.join(". ", descLines);
            if (!desc.endsWith(".") && !desc.endsWith("!") && !desc.endsWith("?")) desc += ".";
            d.descripcionCorta = desc;
        }

        return (d.comoUsar != null || d.especificaciones != null || d.descripcionCorta != null) ? d : null;
    }

    // ---- DTOs internos ----

    public static class PrecioExtraido {
        public String fuente;
        public String url;
        public Integer precioUsd;
        public Integer precioCrc;
    }

    public static class ResultadoExtraccion {
        public String etiquetaPrincipal;
        public List<String> todasEtiquetas = new ArrayList<>();
        public List<PrecioExtraido> precios = new ArrayList<>();
        public int promedioCrc;
        public int tcUsado;
        public String error;

        public boolean tienePrecios() { return !precios.isEmpty(); }
    }

    public static class DetallesProducto {
        public String nombre;
        public String titulo;
        public List<String> todasEtiquetas = new ArrayList<>();
        public String descripcionCorta;
        public String descripcionLarga;
        public String especificaciones;
        public String comoUsar;
        public String marca;
        public String fuenteDetalles;
        public List<PrecioExtraido> precios = new ArrayList<>();
        public int promedioCrc;
        public int precioSugerido;
        public int tcUsado;
        public String error;
    }
}
