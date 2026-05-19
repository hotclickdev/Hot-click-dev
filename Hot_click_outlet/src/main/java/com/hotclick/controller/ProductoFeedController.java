package com.hotclick.controller;

import com.hotclick.model.Categoria;
import com.hotclick.model.Producto;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


import java.time.LocalDate;
import java.util.List;

@RestController
public class ProductoFeedController {

    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    @Value("${app.url:https://hotclick.com}")
    private String appUrl;

    // ─── Google Merchant Center Feed ─────────────────────────────────────────

    @GetMapping(value = "/api/public/feed/shopping.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> shoppingFeed() {
        List<Producto> productos = productoRepository.findParaFeed();

        StringBuilder xml = new StringBuilder(1024 + productos.size() * 300);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<rss version=\"2.0\" xmlns:g=\"http://base.google.com/ns/1.0\">\n");
        xml.append("  <channel>\n");
        xml.append("    <title>HOTCLICK Outlet</title>\n");
        xml.append("    <link>").append(appUrl).append("</link>\n");
        xml.append("    <description>Ropa, Zapatos y Accesorios de Marca en Costa Rica</description>\n");

        for (Producto p : productos) {
            String nombre = (p.getTituloProducto() != null && !p.getTituloProducto().isBlank())
                    ? p.getTituloProducto() : p.getNombreProducto();
            String marcaNombre = p.getMarca() != null ? p.getMarca().getNombreMarca() : null;
            String title    = marcaNombre != null ? nombre + " - " + marcaNombre : nombre;
            String desc     = stripHtml(p.getDescripcionCorta() != null ? p.getDescripcionCorta() : nombre);
            String imagen   = p.getImagenPrincipalUrl() != null ? p.getImagenPrincipalUrl() : "";
            String brand    = marcaNombre != null ? marcaNombre : "HOTCLICK";
            String condicion = condicionGMC(p.getCondicion());

            xml.append("    <item>\n");
            xml.append("      <g:id>").append(p.getId()).append("</g:id>\n");
            xml.append("      <title>").append(xe(title)).append("</title>\n");
            xml.append("      <description>").append(xe(desc)).append("</description>\n");
            xml.append("      <link>").append(xe(appUrl + "/productos/" + p.getId())).append("</link>\n");
            if (!imagen.isBlank()) {
                xml.append("      <g:image_link>").append(xe(imagen)).append("</g:image_link>\n");
            }
            xml.append("      <g:price>").append(p.getPrecioVenta()).append(".00 CRC</g:price>\n");
            xml.append("      <g:availability>in stock</g:availability>\n");
            xml.append("      <g:condition>").append(condicion).append("</g:condition>\n");
            xml.append("      <g:brand>").append(xe(brand)).append("</g:brand>\n");
            xml.append("    </item>\n");
        }

        xml.append("  </channel>\n");
        xml.append("</rss>");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/xml;charset=UTF-8"))
                .body(xml.toString());
    }

    // ─── Sitemap ──────────────────────────────────────────────────────────────

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        List<Producto> productos = productoRepository.findActivosVisibles();
        List<Categoria> categorias = categoriaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        String hoy = LocalDate.now().toString();

        StringBuilder xml = new StringBuilder(1024 + (productos.size() + categorias.size()) * 150);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        sitemapUrl(xml, appUrl + "/",          "1.0", "daily",  hoy);
        sitemapUrl(xml, appUrl + "/productos", "0.9", "daily",  hoy);

        for (Categoria c : categorias) {
            sitemapUrl(xml, appUrl + "/productos?categoria=" + c.getId(), "0.7", "weekly", hoy);
        }

        for (Producto p : productos) {
            sitemapUrl(xml, appUrl + "/productos/" + p.getId(), "0.8", "weekly", hoy);
        }

        xml.append("</urlset>");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/xml;charset=UTF-8"))
                .body(xml.toString());
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static void sitemapUrl(StringBuilder sb, String loc, String priority, String changefreq, String lastmod) {
        sb.append("  <url>\n");
        sb.append("    <loc>").append(xe(loc)).append("</loc>\n");
        sb.append("    <lastmod>").append(lastmod).append("</lastmod>\n");
        sb.append("    <changefreq>").append(changefreq).append("</changefreq>\n");
        sb.append("    <priority>").append(priority).append("</priority>\n");
        sb.append("  </url>\n");
    }

    private static String condicionGMC(String condicion) {
        if (condicion == null) return "new";
        return switch (condicion.toUpperCase()) {
            case "USADO"     -> "used";
            case "COMO_NUEVO" -> "refurbished";
            default           -> "new";
        };
    }

    private static String stripHtml(String s) {
        if (s == null || s.isBlank()) return "";
        return s.replaceAll("<[^>]+>", "").replace("&nbsp;", " ").trim();
    }

    /** Escapa los 4 caracteres reservados de XML en contenido de elemento. */
    private static String xe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
