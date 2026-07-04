package com.hotclick.controller;

import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.BlogEntradaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TestimonioRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * Forwards SPA routes to index.html so React Router handles client-side navigation.
 * For /productos/{id}, injects product-specific meta tags into the HTML before serving,
 * so crawlers that don't execute JS still see unique title/description per product.
 */
@Controller
public class SpaController {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private BlogEntradaRepository blogEntradaRepository;

    @Autowired
    private TestimonioRepository testimonioRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl;

    @Value("classpath:/static/index.html")
    private Resource indexHtmlResource;

    private static final String SEO_START = "<!-- HC_SEO_BLOCK_START -->";
    private static final String SEO_END   = "<!-- HC_SEO_BLOCK_END -->";

    private volatile String indexHtmlContent;

    @PostConstruct
    public void loadIndex() throws IOException {
        indexHtmlContent = new String(indexHtmlResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    /** Product detail — injects product-specific meta tags for crawlers. */
    @GetMapping(value = "/productos/{id}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> productPage(@PathVariable String id) {
        try {
            long productId = Long.parseLong(id);
            return productoRepository.findById(productId)
                .filter(p -> p.getEstado() != null && p.getEstado() == 1)
                .map(p -> ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                    .body(injectProductMeta(indexHtmlContent, p)))
                .orElseGet(this::serveSpa);
        } catch (NumberFormatException e) {
            return serveSpa();
        }
    }

    /** Blog post detail — injects article-specific meta tags for crawlers. */
    @GetMapping(value = "/blog/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> blogPostPage(@PathVariable String slug) {
        var opt = blogEntradaRepository.findBySlug(slug);
        if (opt.isEmpty()) return serveSpa();
        BlogEntrada e = opt.get();
        if (!Boolean.TRUE.equals(e.getPublicado()) || e.getEstado() == null || e.getEstado() != 1) {
            return serveSpa();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(injectBlogMeta(indexHtmlContent, e));
    }

    /**
     * Tienda pública de un emprendedor: /tienda/{slug} y todas sus sub-rutas.
     * Inyecta meta tags con el branding del negocio para crawlers y redes sociales.
     * Si el slug no existe o la empresa no es pública devuelve la SPA sin meta tags especiales.
     */
    @GetMapping(value = {"/tienda/{slug}", "/tienda/{slug}/**"},
                produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> tiendaPage(@PathVariable String slug) {
        return empresaRepository.findBySlug(slug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()) && Boolean.TRUE.equals(e.getVisibilidadPublica()))
            .<ResponseEntity<String>>map(e -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(injectTiendaMeta(indexHtmlContent, e)))
            .orElseGet(this::serveSpa);
    }

    @GetMapping(value = {
        "/",
        "/productos",
        "/carrito",
        "/login",
        "/registrar-negocio",
        "/sso-callback",
        "/sso-complete",
        "/mode-select",
        "/registro",
        "/registro-empresa",
        "/perfil",
        "/checkout",
        "/mis-pedidos",
        "/wishlist",
        "/pago/exito",
        "/pago/cancelado",
        "/nosotros",
        "/contacto",
        "/informacion",
        "/servicios",
        "/blog",
        "/emprendimientos",
        "/seleccionar-negocio",
        "/admin/compras",
        "/admin/compras/nueva",
        "/admin/proveedores",
        "/recuperar-carrito/{id}",
        "/admin",
        "/admin/{*path}",
        "/checkout/qr/{token}",
        "/admin/gift-cards",
        "/admin/branding",
        "/admin/plugins",
        "/admin/inventario",
        "/admin/copilot",
        "/admin/forecast",
        "/admin/executive",
        "/admin/multipais"
    })
    public String spa() {
        return "forward:/index.html";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<String> serveSpa() {
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
            .body(indexHtmlContent);
    }

    private String injectProductMeta(String html, Producto p) {
        String nombre = p.getTituloProducto() != null && !p.getTituloProducto().isBlank()
            ? p.getTituloProducto() : p.getNombreProducto();

        // Prefer explicit meta fields set by admin; fall back to computed values
        String metaTitle = p.getMetaTitle() != null && !p.getMetaTitle().isBlank()
            ? p.getMetaTitle() : buildProductTitle(nombre, p);

        String metaDesc = p.getMetaDescription() != null && !p.getMetaDescription().isBlank()
            ? p.getMetaDescription() : buildProductDescription(nombre, p);

        String imagen = p.getImagenPrincipalUrl() != null && !p.getImagenPrincipalUrl().isBlank()
            ? p.getImagenPrincipalUrl() : appUrl + "/og-image.png";

        String url = appUrl + "/productos/" + p.getId();

        long   ratingCount = Optional.ofNullable(testimonioRepository.countAprobadosConCalificacion(p.getId())).orElse(0L);
        Double ratingAvg   = ratingCount > 0 ? testimonioRepository.avgCalificacion(p.getId()) : null;

        String aggregateRatingJson = "";
        if (ratingAvg != null && ratingCount > 0) {
            double rounded = Math.round(ratingAvg * 10.0) / 10.0;
            aggregateRatingJson = "\n    <script type=\"application/ld+json\">\n" +
                "    {\"@context\":\"https://schema.org\",\"@type\":\"Product\"," +
                "\"name\":\"" + escJson(nombre) + "\"," +
                "\"aggregateRating\":{\"@type\":\"AggregateRating\"," +
                "\"ratingValue\":\"" + rounded + "\"," +
                "\"reviewCount\":\"" + ratingCount + "\"," +
                "\"bestRating\":\"5\",\"worstRating\":\"1\"}}" +
                "\n    </script>";
        }

        String seoBlock = SEO_START + "\n" +
            "    <title>" + xe(metaTitle) + "</title>\n" +
            "    <meta name=\"description\" content=\"" + xa(metaDesc) + "\" />\n" +
            "    <meta name=\"robots\" content=\"index, follow, max-snippet:-1, max-image-preview:large\" />\n" +
            "    <link rel=\"canonical\" href=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:title\" content=\"" + xa(metaTitle) + "\" />\n" +
            "    <meta property=\"og:description\" content=\"" + xa(metaDesc) + "\" />\n" +
            "    <meta property=\"og:type\" content=\"product\" />\n" +
            "    <meta property=\"og:url\" content=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    <meta property=\"og:image:alt\" content=\"" + xa(nombre + " — HOTCLICK Costa Rica") + "\" />\n" +
            "    <meta property=\"og:locale\" content=\"es_CR\" />\n" +
            "    <meta property=\"og:site_name\" content=\"HOTCLICK\" />\n" +
            "    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
            "    <meta name=\"twitter:site\" content=\"@hotclickcr\" />\n" +
            "    <meta name=\"twitter:title\" content=\"" + xa(metaTitle) + "\" />\n" +
            "    <meta name=\"twitter:description\" content=\"" + xa(metaDesc) + "\" />\n" +
            "    <meta name=\"twitter:image\" content=\"" + xa(imagen) + "\" />" +
            aggregateRatingJson + "\n" +
            "    " + SEO_END;

        int start = html.indexOf(SEO_START);
        int end   = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }

    private String buildProductTitle(String nombre, Producto p) {
        String marca = p.getMarca() != null ? p.getMarca().getNombreMarca() : p.getMarcaTexto();
        return marca != null && !marca.isBlank()
            ? nombre + " – " + marca + " | HOTCLICK"
            : nombre + " | HOTCLICK Costa Rica";
    }

    private String buildProductDescription(String nombre, Producto p) {
        String base = p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()
            ? p.getDescripcionCorta()
            : nombre;
        // trim to 130 chars, leaving room for the price suffix
        if (base.length() > 130) base = base.substring(0, 127) + "...";
        String precio = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"))
            .format(p.getPrecioVenta());
        return base + " – ₡" + precio + " | Envío a todo Costa Rica.";
    }

    private String injectBlogMeta(String html, BlogEntrada e) {
        String title = xe(e.getTitulo()) + " | Blog HOTCLICK";
        String desc  = e.getResumen() != null && !e.getResumen().isBlank()
            ? e.getResumen()
            : e.getTitulo();
        if (desc.length() > 155) desc = desc.substring(0, 152) + "...";

        String imagen = e.getImagenUrl() != null && !e.getImagenUrl().isBlank()
            ? e.getImagenUrl() : appUrl + "/og-image.png";
        String url = appUrl + "/blog/" + (e.getSlug() != null ? e.getSlug() : e.getId());

        String seoBlock = SEO_START + "\n" +
            "    <title>" + xe(title) + "</title>\n" +
            "    <meta name=\"description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta name=\"robots\" content=\"index, follow\" />\n" +
            "    <link rel=\"canonical\" href=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta property=\"og:description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta property=\"og:type\" content=\"article\" />\n" +
            "    <meta property=\"og:url\" content=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    <meta property=\"og:image:alt\" content=\"" + xa(e.getTitulo()) + "\" />\n" +
            "    <meta property=\"og:locale\" content=\"es_CR\" />\n" +
            "    <meta property=\"og:site_name\" content=\"HOTCLICK\" />\n" +
            "    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
            "    <meta name=\"twitter:site\" content=\"@hotclickcr\" />\n" +
            "    <meta name=\"twitter:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta name=\"twitter:description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta name=\"twitter:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    " + SEO_END;

        int start = html.indexOf(SEO_START);
        int end   = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }

    private String injectTiendaMeta(String html, Empresa empresa) {
        String nombre = empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa();
        String title  = xe(nombre) + " | Tienda en línea";
        String desc   = empresa.getTagline() != null && !empresa.getTagline().isBlank()
            ? empresa.getTagline()
            : "Compra en " + nombre + " — envíos a todo Costa Rica.";
        if (desc.length() > 155) desc = desc.substring(0, 152) + "...";
        String imagen = empresa.getOgImagenUrl() != null && !empresa.getOgImagenUrl().isBlank()
            ? empresa.getOgImagenUrl()
            : (empresa.getLogoUrl() != null && !empresa.getLogoUrl().isBlank()
                ? empresa.getLogoUrl() : appUrl + "/og-image.png");
        String url = appUrl + "/tienda/" + empresa.getSlug();

        String seoBlock = SEO_START + "\n" +
            "    <title>" + xe(title) + "</title>\n" +
            "    <meta name=\"description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta name=\"robots\" content=\"index, follow\" />\n" +
            "    <link rel=\"canonical\" href=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta property=\"og:description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta property=\"og:type\" content=\"website\" />\n" +
            "    <meta property=\"og:url\" content=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    <meta property=\"og:locale\" content=\"es_CR\" />\n" +
            "    <meta property=\"og:site_name\" content=\"" + xa(nombre) + "\" />\n" +
            "    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
            "    <meta name=\"twitter:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta name=\"twitter:description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta name=\"twitter:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    " + SEO_END;

        int start = html.indexOf(SEO_START);
        int end   = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }

    /** Escapes double quotes and backslashes for JSON string values. */
    private static String escJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    /** Escapes XML element content. */
    private static String xe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /** Escapes XML attribute value (double-quoted). */
    private static String xa(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }
}
