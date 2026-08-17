package com.hotclick.service.extraccion;

import com.hotclick.service.ExtraccionService;
import com.hotclick.service.ScrapingClient;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
class ExtraccionPrecioResultadosExtractor {

    @Autowired
    private ScrapingClient scrapingClient;
    @Autowired
    private ExtraccionPrecioRegexExtractor extraccionPrecioRegexExtractor;

    ExtraccionService.PrecioExtraido extraerPrecioDeResultados(String searchUrl, int tc) {
        Document doc = scrapingClient.fetchDocument(searchUrl, ExtraccionPrecioTextUtils.USER_AGENT_DESKTOP, Map.of(
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
                    Integer usd = ExtraccionPrecioTextUtils.parsearPrecio(texto);
                    if (usd != null && usd > 0 && usd < 50000) {
                        ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
                        p.fuente = ExtraccionPrecioTextUtils.extraerNombreFuente(searchUrl);
                        p.url = searchUrl;
                        p.precioUsd = usd;
                        p.precioCrc = usd * tc;
                        return p;
                    }
                }
            }
        }

        // Fallback: regex en texto completo
        String val = extraccionPrecioRegexExtractor.extraerTextoPrecio(doc.text());
        if (val != null) {
            Integer usd = ExtraccionPrecioTextUtils.parsearPrecio(val);
            if (usd != null && usd > 5 && usd < 50000) {
                ExtraccionService.PrecioExtraido p = new ExtraccionService.PrecioExtraido();
                p.fuente = ExtraccionPrecioTextUtils.extraerNombreFuente(searchUrl);
                p.url = searchUrl;
                p.precioUsd = usd;
                p.precioCrc = usd * tc;
                return p;
            }
        }
        return null;
    }
}
