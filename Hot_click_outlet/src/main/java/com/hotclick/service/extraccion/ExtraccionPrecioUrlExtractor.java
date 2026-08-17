package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.ScrapingClient;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
class ExtraccionPrecioUrlExtractor {

    @Autowired
    private ScrapingClient scrapingClient;
    @Autowired
    private ExtraccionPrecioRegexExtractor extraccionPrecioRegexExtractor;

    ExtraccionService.PrecioExtraido extraerPrecioDeUrl(String url, int tc) {
        Document doc = scrapingClient.fetchDocument(url, ExtraccionPrecioTextUtils.USER_AGENT_DESKTOP, Map.of(
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
            precioStr = extraccionPrecioRegexExtractor.extraerTextoPrecio(doc.text());
        }

        if (precioStr != null && !precioStr.isBlank()) {
            Integer usd = ExtraccionPrecioTextUtils.parsearPrecio(precioStr);
            if (usd != null && usd > 0 && usd < 50000) {
                ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
                p.fuente = ExtraccionPrecioTextUtils.extraerNombreFuente(url);
                p.url = url;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }
}
