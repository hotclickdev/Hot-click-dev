package com.hotclick.service.extraccion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.service.ExtraccionService;
import com.hotclick.service.ScrapingClient;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
class ExtraccionWebBusquedaDetalleExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionWebBusquedaDetalleExtractor.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private ScrapingClient scrapingClient;
    @Autowired
    private ExtraccionUrlDetalleExtractor extraccionUrlDetalleExtractor;

    String buscarDescripcionPorNombre(String nombre) {
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
            Document doc = scrapingClient.fetchDocument(url, ExtraccionDetalleTextUtils.USER_AGENT_DESKTOP,
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
    String buscarEnDuckDuckGo(String query) {
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
    List<String> buscarUrlsProductoEnWeb(String nombre, List<String> etiquetas) {
        List<String> urls = new ArrayList<>();
        String base = (nombre != null && !nombre.isBlank())
            ? nombre
            : (etiquetas.isEmpty() ? "" : etiquetas.get(0));
        if (base.isBlank()) return urls;
        String enc = URLEncoder.encode(base + " product specifications review", StandardCharsets.UTF_8);
        Document doc = scrapingClient.fetchDocument("https://html.duckduckgo.com/html/?q=" + enc, ExtraccionDetalleTextUtils.USER_AGENT_DESKTOP,
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
            if (href.startsWith("http") && !href.contains("duckduckgo.com") && !ExtraccionDetalleTextUtils.esPaginaDeResultados(href)) {
                urls.add(href);
                if (urls.size() >= 4) break;
            }
        }
        return urls;
    }

    String buscarEspecificacionesPorNombre(String nombre) {
        String query = nombre.trim().replace(" ", "+");
        Document doc = scrapingClient.fetchDocument("https://www.newegg.com/p/pl?d=" + query, ExtraccionDetalleTextUtils.USER_AGENT_DESKTOP,
            Map.of(), 8000);
        if (doc == null) return null;
        // Buscar primer link de producto y scrapearlo
        Element productLink = doc.selectFirst("a.item-title");
        if (productLink != null) {
            String productUrl = productLink.attr("abs:href");
            if (!productUrl.isBlank()) {
                ExtraccionService.DetallesProducto d2 = extraccionUrlDetalleExtractor.extraerDetallesDeUrl(productUrl);
                if (d2 != null && d2.especificaciones != null) return d2.especificaciones;
            }
        }
        return null;
    }
}
