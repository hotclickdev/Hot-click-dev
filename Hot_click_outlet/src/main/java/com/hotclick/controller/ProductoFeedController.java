package com.hotclick.controller;

import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Categoria;
import com.hotclick.model.Producto;
import com.hotclick.repository.BlogEntradaRepository;
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

    @Autowired private ProductoRepository    productoRepository;
    @Autowired private CategoriaRepository   categoriaRepository;
    @Autowired private BlogEntradaRepository blogEntradaRepository;

    @Value("${app.url:https://hotclick.lat}")
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
        List<Producto>    productos  = productoRepository.findActivosVisibles();
        List<Categoria>   categorias = categoriaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        List<BlogEntrada> articulos  = blogEntradaRepository.findByPublicadoTrueAndEstadoOrderByFechaPublicacionDesc(1);
        String hoy = LocalDate.now(Constants.ZONA_CR).toString();

        StringBuilder xml = new StringBuilder(2048 + (productos.size() + categorias.size()) * 200);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"\n");
        xml.append("        xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n");

        // Páginas principales
        sitemapUrl(xml, appUrl + "/",              "1.0", "daily",   hoy);
        sitemapUrl(xml, appUrl + "/productos",     "0.9", "daily",   hoy);
        sitemapUrl(xml, appUrl + "/emprende", "0.8", "weekly", hoy);
        sitemapUrl(xml, appUrl + "/emprendimientos", "0.6", "weekly", hoy);
        sitemapUrl(xml, appUrl + "/nosotros",      "0.5", "monthly", hoy);
        sitemapUrl(xml, appUrl + "/contacto",      "0.5", "monthly", hoy);
        sitemapUrl(xml, appUrl + "/servicios",     "0.5", "monthly", hoy);
        sitemapUrl(xml, appUrl + "/blog",          "0.6", "weekly",  hoy);

        // Páginas de categoría
        for (Categoria c : categorias) {
            sitemapUrl(xml, appUrl + "/productos?cat=" + c.getId(), "0.7", "weekly", hoy);
        }

        // Páginas de producto individuales — con imagen para Google Images
        for (Producto p : productos) {
            String lastmod = lastmodProducto(p, hoy);
            String imagen = p.getImagenPrincipalUrl() != null ? p.getImagenPrincipalUrl() : "";
            String nombre = (p.getTituloProducto() != null && !p.getTituloProducto().isBlank())
                ? p.getTituloProducto() : p.getNombreProducto();

            xml.append("  <url>\n");
            xml.append("    <loc>").append(xe(appUrl + "/productos/" + p.getId())).append("</loc>\n");
            xml.append("    <lastmod>").append(lastmod).append("</lastmod>\n");
            xml.append("    <changefreq>weekly</changefreq>\n");
            xml.append("    <priority>0.8</priority>\n");
            if (!imagen.isBlank()) {
                xml.append("    <image:image>\n");
                xml.append("      <image:loc>").append(xe(imagen)).append("</image:loc>\n");
                xml.append("      <image:title>").append(xe(nombre)).append("</image:title>\n");
                xml.append("    </image:image>\n");
            }
            xml.append("  </url>\n");
        }

        // Artículos del blog — con fecha de publicación real como lastmod
        for (BlogEntrada a : articulos) {
            String lastmod = a.getFechaPublicacion() != null
                ? a.getFechaPublicacion().toLocalDate().toString() : hoy;
            String slug = a.getSlug() != null && !a.getSlug().isBlank()
                ? a.getSlug() : String.valueOf(a.getId());
            sitemapUrl(xml, appUrl + "/blog/" + slug, "0.7", "monthly", lastmod);
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

    private static String lastmodProducto(Producto p, String hoy) {
        if (p.getFechaUltimaVenta() != null) return p.getFechaUltimaVenta().toLocalDate().toString();
        if (p.getFechaCreacion() != null) return p.getFechaCreacion().toLocalDate().toString();
        return hoy;
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
