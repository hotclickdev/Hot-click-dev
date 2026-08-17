package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.ScrapingClient;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
class ExtraccionUrlDetalleExtractor {

    private static final Logger log = LoggerFactory.getLogger(ExtraccionUrlDetalleExtractor.class);

    @Autowired
    private ScrapingClient scrapingClient;
    @Autowired
    private ExtraccionPrecioExtractor extraccionPrecioExtractor;
    @Autowired
    private ExtraccionJsonLdDetalleExtractor extraccionJsonLdDetalleExtractor;

    ExtraccionService.DetallesProducto extraerDetallesDeUrl(String url) {
        Document doc = scrapingClient.fetchDocument(url, ExtraccionDetalleTextUtils.USER_AGENT_DESKTOP, Map.of(
            "Accept-Language", "en-US,en;q=0.9",
            "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        ), 10000);
        if (doc == null) return null;

        try {
            ExtraccionService.DetallesProducto d = new ExtraccionService.DetallesProducto();
            d.fuenteDetalles = extraccionPrecioExtractor.extraerNombreFuente(url);

            // JSON-LD schema.org (más fiable que selectores CSS)
            extraccionJsonLdDetalleExtractor.extraerDeJsonLD(doc, d);

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
}
