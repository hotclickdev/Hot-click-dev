package com.hotclick.controller.spa;

import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.TestimonioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * Helpers de SEO de la SPA extraídos de SpaController sin cambiar comportamiento.
 */
@Component
public class SpaSeoSupport {

    private static final String SEO_START = "<!-- HC_SEO_BLOCK_START -->";
    private static final String SEO_END = "<!-- HC_SEO_BLOCK_END -->";

    private final TestimonioRepository testimonioRepository;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl;

    public SpaSeoSupport(TestimonioRepository testimonioRepository) {
        this.testimonioRepository = testimonioRepository;
    }

    public String injectProductMeta(String html, Producto p) {
        String nombre = p.getTituloProducto() != null && !p.getTituloProducto().isBlank()
            ? p.getTituloProducto() : p.getNombreProducto();

        String metaTitle = p.getMetaTitle() != null && !p.getMetaTitle().isBlank()
            ? p.getMetaTitle() : buildProductTitle(nombre, p);

        String metaDesc = p.getMetaDescription() != null && !p.getMetaDescription().isBlank()
            ? p.getMetaDescription() : buildProductDescription(nombre, p);

        String imagen = p.getImagenPrincipalUrl() != null && !p.getImagenPrincipalUrl().isBlank()
            ? p.getImagenPrincipalUrl() : appUrl + "/og-image.png";

        String url = appUrl + "/productos/" + p.getId();

        long ratingCount = Optional.ofNullable(testimonioRepository.countAprobadosConCalificacion(p.getId())).orElse(0L);
        Double ratingAvg = ratingCount > 0 ? testimonioRepository.avgCalificacion(p.getId()) : null;

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

        return replaceSeoBlock(html, seoBlock);
    }

    public String buildProductTitle(String nombre, Producto p) {
        String marca = p.getMarca() != null ? p.getMarca().getNombreMarca() : p.getMarcaTexto();
        return marca != null && !marca.isBlank()
            ? nombre + " – " + marca + " | HOTCLICK"
            : nombre + " | HOTCLICK Costa Rica";
    }

    public String buildProductDescription(String nombre, Producto p) {
        String base = p.getDescripcionCorta() != null && !p.getDescripcionCorta().isBlank()
            ? p.getDescripcionCorta()
            : nombre;
        if (base.length() > 130) base = base.substring(0, 127) + "...";
        String precio = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"))
            .format(p.getPrecioVenta());
        return base + " – ₡" + precio + " | Envío a todo Costa Rica.";
    }

    public String injectBlogMeta(String html, BlogEntrada e) {
        String title = xe(e.getTitulo()) + " | Blog HOTCLICK";
        String desc = e.getResumen() != null && !e.getResumen().isBlank()
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

        return replaceSeoBlock(html, seoBlock);
    }

    public String injectTiendaMeta(String html, Empresa empresa) {
        String nombre = empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()
            ? empresa.getNombreComercial() : empresa.getNombreEmpresa();
        String title = xe(nombre) + " | Tienda en línea";
        String desc = empresa.getTagline() != null && !empresa.getTagline().isBlank()
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

        return replaceSeoBlock(html, seoBlock);
    }

    public static String escJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    public static String xe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    public static String xa(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }

    private String replaceSeoBlock(String html, String seoBlock) {
        int start = html.indexOf(SEO_START);
        int end = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }
}
