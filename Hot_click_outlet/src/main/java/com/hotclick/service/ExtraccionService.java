package com.hotclick.service;

import com.hotclick.service.GoogleVisionService.VisionResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExtraccionService {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionService.class);

    // Regex para detectar precios en USD: $12.99 / USD 12.99 / 12,99 USD
    private static final Pattern PRECIO_USD = Pattern.compile(
        "(?:USD|US\\$|\\$)\\s*(\\d{1,6}(?:[.,]\\d{1,2})?)|" +
        "(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*(?:USD|US\\$)"
    );

    @Autowired
    private BccrService bccrService;

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
        for (int intento = 1; intento <= 3; intento++) {
            try {
                Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept-Language", "es-CR,es;q=0.9,en;q=0.8")
                    .timeout(8000)
                    .get();

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
                break;
            } catch (Exception e) {
                log.debug("Intento {} fallido para {}: {}", intento, url, e.getMessage());
                if (intento == 3) log.warn("No se pudo extraer precio de {}", url);
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
}
