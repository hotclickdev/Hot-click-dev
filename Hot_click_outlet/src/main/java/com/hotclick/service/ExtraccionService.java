package com.hotclick.service;

import com.hotclick.service.GoogleVisionService.VisionResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
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

        for (String url : urlsBusqueda) {
            PrecioExtraido precio = extraerPrecioDeResultados(url, resultado.tcUsado);
            if (precio != null) resultado.precios.add(precio);
        }

        if (!resultado.precios.isEmpty()) {
            resultado.promedioCrc = calcularPromedio(resultado.precios);
        } else {
            resultado.error = "No se encontraron precios para \"" + nombreProducto + "\"";
        }
        return resultado;
    }

    private PrecioExtraido extraerPrecioDeResultados(String searchUrl, int tc) {
        for (int intento = 1; intento <= 2; intento++) {
            try {
                Document doc = Jsoup.connect(searchUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .timeout(10000)
                    .get();

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
                break;
            } catch (Exception e) {
                log.debug("Intento {} fallido para búsqueda {}: {}", intento, searchUrl, e.getMessage());
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

    /** Analiza una o varias imágenes y devuelve datos completos del producto (fusionando resultados). */
    public DetallesProducto extraerDetallesProducto(List<String> imagenesBase64, GoogleVisionService vision) {
        // Analizar todas las imágenes y fusionar etiquetas + URLs de ecommerce
        VisionResult visionResult = fusionarVisionResults(imagenesBase64, vision);
        return extraerDetallesDeVisionResult(visionResult);
    }

    private VisionResult fusionarVisionResults(List<String> imagenesBase64, GoogleVisionService vision) {
        VisionResult merged = null;
        for (String b64 : imagenesBase64) {
            VisionResult r = vision.analizar(b64);
            if (merged == null) {
                merged = r;
            } else {
                // Agregar etiquetas únicas
                for (String etiqueta : r.etiquetas) {
                    if (!merged.etiquetas.contains(etiqueta)) merged.etiquetas.add(etiqueta);
                }
                // Agregar URLs únicas
                for (String url : r.urlsEcommerce) {
                    if (!merged.urlsEcommerce.contains(url)) merged.urlsEcommerce.add(url);
                }
            }
        }
        return merged != null ? merged : new VisionResult();
    }

    private DetallesProducto extraerDetallesDeVisionResult(VisionResult visionResult) {
        DetallesProducto d = new DetallesProducto();
        d.tcUsado = bccrService.getTipoCambioVenta();

        if (!visionResult.tieneResultados()) {
            d.error = "Vision API no identificó el producto";
            return d;
        }
        d.nombre = visionResult.getEtiquetaPrincipal();
        d.todasEtiquetas = new ArrayList<>(visionResult.etiquetas);

        // Intentar extraer descripción y specs de la primera página de ecommerce reconocida
        for (String url : visionResult.urlsEcommerce) {
            if (!esUrlEcommerce(url)) continue;
            DetallesProducto scraped = extraerDetallesDeUrl(url);
            if (scraped != null) {
                if (scraped.nombre != null && !scraped.nombre.isBlank()) d.nombre = scraped.nombre;
                d.descripcionCorta = scraped.descripcionCorta;
                d.descripcionLarga = scraped.descripcionLarga;
                d.especificaciones = scraped.especificaciones;
                d.marca = scraped.marca;
                d.fuenteDetalles = scraped.fuenteDetalles;
                break;
            }
        }

        // Extraer precios de hasta 8 URLs
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

        // Fallback: si no obtuvimos descripción de las URLs de Vision, buscar por nombre
        if (d.descripcionCorta == null && d.nombre != null) {
            d.descripcionCorta = buscarDescripcionPorNombre(d.nombre);
        }
        if (d.especificaciones == null && d.nombre != null) {
            d.especificaciones = buscarEspecificacionesPorNombre(d.nombre);
        }

        d.comoUsar = generarComoUsar(d.nombre);

        // Truncar campos a los límites de la BD
        d.nombre          = truncar(d.nombre, 198);
        d.descripcionCorta = truncar(d.descripcionCorta, 298);
        d.marca            = truncar(d.marca, 98);
        return d;
    }

    private String buscarDescripcionPorNombre(String nombre) {
        String query = nombre.trim().replace(" ", "+");
        String[] urls = {
            "https://www.newegg.com/p/pl?d=" + query,
            "https://www.bestbuy.com/site/searchpage.jsp?st=" + query,
            "https://www.walmart.com/search?q=" + query,
        };
        for (String url : urls) {
            try {
                Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .timeout(8000)
                    .get();
                // Meta description
                Element meta = doc.selectFirst("meta[name=description], meta[property=og:description]");
                if (meta != null) {
                    String content = meta.attr("content").trim();
                    if (content.length() > 30) return content;
                }
                // Snippet de descripción en resultados
                for (String sel : new String[]{".item-description", ".product-description", ".short-description", "[data-testid=description]"}) {
                    Element el = doc.selectFirst(sel);
                    if (el != null && !el.text().isBlank()) return el.text().trim();
                }
            } catch (Exception e) {
                log.debug("Descripción no encontrada en {}: {}", url, e.getMessage());
            }
        }
        return null;
    }

    private String buscarEspecificacionesPorNombre(String nombre) {
        String query = nombre.trim().replace(" ", "+");
        try {
            Document doc = Jsoup.connect("https://www.newegg.com/p/pl?d=" + query)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
                .timeout(8000)
                .get();
            // Buscar primer link de producto y scrapearlo
            Element productLink = doc.selectFirst("a.item-title");
            if (productLink != null) {
                String productUrl = productLink.attr("abs:href");
                if (!productUrl.isBlank()) {
                    DetallesProducto d2 = extraerDetallesDeUrl(productUrl);
                    if (d2 != null && d2.especificaciones != null) return d2.especificaciones;
                }
            }
        } catch (Exception e) {
            log.debug("Specs no encontradas para {}: {}", nombre, e.getMessage());
        }
        return null;
    }

    private DetallesProducto extraerDetallesDeUrl(String url) {
        try {
            Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .timeout(10000)
                .get();

            DetallesProducto d = new DetallesProducto();
            d.fuenteDetalles = extraerNombreFuente(url);

            // Nombre
            for (String sel : new String[]{"#productTitle", ".x-item-title__mainTitle span", "h1[itemprop=name]", "h1"}) {
                Element el = doc.selectFirst(sel);
                if (el != null && !el.text().isBlank()) { d.nombre = el.text().trim(); break; }
            }

            // Feature bullets de Amazon → descripción corta
            Elements bullets = doc.select("#feature-bullets .a-list-item, #feature-bullets li");
            if (!bullets.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                int n = 0;
                for (Element b : bullets) {
                    String t = b.text().trim();
                    if (!t.isBlank() && n++ < 5) sb.append("• ").append(t).append("\n");
                }
                d.descripcionCorta = sb.toString().trim();
            }

            // Meta description como fallback
            if (d.descripcionCorta == null) {
                Element meta = doc.selectFirst("meta[name=description], meta[property=og:description]");
                if (meta != null && !meta.attr("content").isBlank())
                    d.descripcionCorta = meta.attr("content").trim();
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

    private String generarComoUsar(String nombre) {
        if (nombre == null) return null;
        String lower = nombre.toLowerCase();
        if (lower.contains("crema") || lower.contains("serum") || lower.contains("moisturizer") ||
                lower.contains("skincare") || lower.contains("lotion") || lower.contains("skin")) {
            return "Aplicar una pequeña cantidad en la piel limpia y seca. Masajear suavemente en movimientos circulares hasta absorber completamente. Usar según las indicaciones del fabricante.";
        }
        if (lower.contains("charger") || lower.contains("cargador") || lower.contains("cable") || lower.contains("adapter")) {
            return "Conectar el cable al dispositivo y al adaptador de corriente. Verificar que los conectores encajen correctamente antes de iniciar la carga.";
        }
        if (lower.contains("headphone") || lower.contains("auricular") || lower.contains("earphone") || lower.contains("earbuds")) {
            return "Conectar los auriculares al dispositivo de audio o emparejar vía Bluetooth. Ajustar el volumen a un nivel cómodo. Usar a volumen moderado para proteger la audición.";
        }
        if (lower.contains("phone") || lower.contains("celular") || lower.contains("smartphone") || lower.contains("iphone")) {
            return "Insertar la tarjeta SIM y encender el dispositivo. Seguir las instrucciones en pantalla para la configuración inicial. Cargar completamente antes del primer uso.";
        }
        if (lower.contains("tablet") || lower.contains("laptop") || lower.contains("computer")) {
            return "Cargar completamente el dispositivo antes del primer uso. Seguir las instrucciones de configuración inicial en pantalla. Consultar el manual para funciones avanzadas.";
        }
        return "Seguir las instrucciones del fabricante para el uso correcto del producto. Mantener fuera del alcance de los niños. Conservar en un lugar fresco y seco.";
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
