package com.hotclick.service.catalogo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class CatalogoUrlExtractor {

    private static final Logger log = LoggerFactory.getLogger(CatalogoUrlExtractor.class);

    private static final int MAX_TEXT_CHARS = 14_000;
    private static final int MAX_TEXT_CHARS_JSON = 40_000;
    private static final List<String> SELECTORES_JSON_HIDRATACION = List.of(
        "script#__NEXT_DATA__",
        "script#__NUXT_DATA__"
    );
    private static final Pattern PATRON_ICONO = Pattern.compile(
        "(icon|logo|sprite|spinner|loading|placeholder|badge|payment|pixel|tracking|avatar|flag-)",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final ObjectMapper mapper = new ObjectMapper();
    private final CatalogoClaudeClient claudeClient;
    private final CatalogoHeadlessBrowserRenderer headlessBrowserRenderer;

    public CatalogoUrlExtractor(CatalogoClaudeClient claudeClient,
                                CatalogoHeadlessBrowserRenderer headlessBrowserRenderer) {
        this.claudeClient = claudeClient;
        this.headlessBrowserRenderer = headlessBrowserRenderer;
    }

    public List<com.hotclick.dto.ProductoExtraidoDto> extraerDeUrl(String rawUrl) throws Exception {
        log.info("[import-url] descargando {}", rawUrl);

        String html = descargarHtml(rawUrl);
        String jsonProductos = extraerJsonProductosEmbebido(html);

        List<com.hotclick.dto.ProductoExtraidoDto> productos;
        if (jsonProductos != null) {
            log.info("[import-url] usando JSON de hidratación embebido: {} chars", jsonProductos.length());
            productos = claudeClient.extraerConClaude(truncar(jsonProductos, MAX_TEXT_CHARS_JSON), "página web (datos JSON embebidos)");
        } else {
            String texto = limpiarHtml(html, rawUrl);
            log.info("[import-url] texto extraído con Jsoup: {} chars", texto.length());
            productos = claudeClient.extraerConClaude(truncar(texto, MAX_TEXT_CHARS), "página web");
        }

        if (productos.isEmpty() && headlessBrowserRenderer.navegadorDisponible()) {
            log.info("[import-url] 0 productos con la versión simple — probablemente un sitio JS/SPA, " +
                "reintentando con navegador headless");
            try {
                String htmlRenderizado = headlessBrowserRenderer.renderizarConNavegador(rawUrl);
                String textoRenderizado = limpiarHtml(htmlRenderizado, rawUrl);
                log.info("[import-url] texto extraído con navegador: {} chars", textoRenderizado.length());
                List<com.hotclick.dto.ProductoExtraidoDto> productosRenderizado =
                    claudeClient.extraerConClaude(truncar(textoRenderizado), "página web (renderizada con navegador)");
                if (!productosRenderizado.isEmpty()) {
                    productos = productosRenderizado;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("[import-url] fallback con navegador headless interrumpido");
            } catch (Exception e) {
                log.warn("[import-url] fallback con navegador headless falló: {}", e.getMessage());
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
        doc.select("script, style, noscript, svg, iframe, header, footer, nav").remove();

        for (org.jsoup.nodes.Element img : doc.select("img[src], img[data-src]")) {
            String src = !img.attr("src").isBlank() ? img.absUrl("src") : img.absUrl("data-src");
            if (src.isBlank() || src.startsWith("data:") || pareceIconoODecorativa(img, src)) {
                continue;
            }
            img.after("\n[IMAGEN_PRODUCTO: " + src + "]\n");
        }

        String texto = Jsoup.clean(doc.body().html(), Safelist.none());
        return texto.replaceAll("\\s{3,}", "\n").trim();
    }

    private boolean pareceIconoODecorativa(org.jsoup.nodes.Element img, String src) {
        if (PATRON_ICONO.matcher(src).find()) {
            return true;
        }
        String widthAttr = img.attr("width");
        String heightAttr = img.attr("height");
        try {
            if (!widthAttr.isBlank() && Integer.parseInt(widthAttr) <= 32) {
                return true;
            }
            if (!heightAttr.isBlank() && Integer.parseInt(heightAttr) <= 32) {
                return true;
            }
        } catch (NumberFormatException ignored) {
        }
        return false;
    }

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
        if (jsonCrudo == null) {
            return null;
        }

        try {
            JsonNode root = mapper.readTree(jsonCrudo);
            List<JsonNode> candidatos = new ArrayList<>();
            recolectarArraysDeProductos(root, 0, candidatos);
            JsonNode mejorCandidato = candidatos.stream()
                .max(Comparator.comparingInt(JsonNode::size))
                .orElse(null);
            if (mejorCandidato == null) {
                return null;
            }

            log.info("[import-url] array de productos encontrado en JSON embebido: {} items", mejorCandidato.size());
            return mapper.writeValueAsString(mejorCandidato);
        } catch (Exception e) {
            log.warn("[import-url] no se pudo interpretar el JSON embebido: {}", e.getMessage());
            return null;
        }
    }

    private void recolectarArraysDeProductos(JsonNode node, int profundidad, List<JsonNode> candidatos) {
        if (node == null || profundidad > 8) {
            return;
        }
        if (node.isArray()) {
            if (node.size() > 0 && node.get(0).isObject() && pareceProducto(node.get(0))) {
                candidatos.add(node);
            }
            for (JsonNode child : node) {
                recolectarArraysDeProductos(child, profundidad + 1, candidatos);
            }
        } else if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> it = node.fields();
            while (it.hasNext()) {
                recolectarArraysDeProductos(it.next().getValue(), profundidad + 1, candidatos);
            }
        }
    }

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

    private String truncar(String texto) {
        return truncar(texto, MAX_TEXT_CHARS);
    }

    private String truncar(String texto, int limite) {
        if (texto == null) {
            return "";
        }
        return texto.length() > limite ? texto.substring(0, limite) + "\n[... texto truncado ...]" : texto;
    }
}
