package com.hotclick.service.extraccion;

import com.hotclick.service.BccrService;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.GoogleVisionService;
import com.hotclick.service.GoogleVisionService.VisionResult;
import com.hotclick.service.ScrapingClient;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExtraccionPrecioExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionPrecioExtractor.class);

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
    private ScrapingClient scrapingClient;

    /** Busca precios en ecommerce usando el nombre del producto (sin Vision API). */
    public ExtraccionService.ResultadoExtraccion extraerPorNombre(String nombreProducto) {
        ExtraccionService.ResultadoExtraccion resultado = new ExtraccionService.ResultadoExtraccion();
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
        List<CompletableFuture<ExtraccionService.PrecioExtraido>> futures = urlsBusqueda.stream()
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
            .map(CompletableFuture::join)
            .filter(Objects::nonNull)
            .forEach(resultado.precios::add);

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        } else {
            resultado.error = "No se encontraron precios para \"" + nombreProducto + "\"";
        }
        return resultado;
    }

    public ExtraccionService.ResultadoExtraccion extraer(String imagenBase64, GoogleVisionService vision) {
        VisionResult visionResult = vision.analizar(imagenBase64);
        ExtraccionService.ResultadoExtraccion resultado = new ExtraccionService.ResultadoExtraccion();
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
            ExtraccionService.PrecioExtraido precio = extraerPrecioDeUrl(url, resultado.tcUsado);
            if (precio != null) {
                resultado.precios.add(precio);
            }
        }

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        }

        return resultado;
    }

    ExtraccionService.PrecioExtraido extraerPrecioDeResultados(String searchUrl, int tc) {
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
                        ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
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
                ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
                p.fuente = extraerNombreFuente(searchUrl);
                p.url = searchUrl;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }

    public boolean esUrlEcommerce(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("amazon") || lower.contains("ebay") || lower.contains("walmart") ||
               lower.contains("tiendamia") || lower.contains("encuentra24") || lower.contains("crautos") ||
               lower.contains("linio") || lower.contains("alibaba") || lower.contains("aliexpress") ||
               lower.contains("mercadolibre") || lower.contains("bestbuy") || lower.contains("newegg");
    }

    public ExtraccionService.PrecioExtraido extraerPrecioDeUrl(String url, int tc) {
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
                ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
                p.fuente = extraerNombreFuente(url);
                p.url = url;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }

    Integer parsearPrecio(String texto) {
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

    String extraerNombreFuente(String url) {
        try {
            String host = new java.net.URI(url).getHost();
            return host != null ? host.replaceFirst("^www\\.", "") : url;
        } catch (Exception e) {
            return url.length() > 50 ? url.substring(0, 50) : url;
        }
    }

    int calcularPromedio(List<ExtraccionService.PrecioExtraido> precios) {
        return (int) precios.stream()
            .mapToInt(p -> p.precioCrc)
            .average()
            .orElse(0);
    }
}
