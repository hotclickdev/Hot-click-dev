package com.hotclick.controller.spa;

import com.hotclick.dto.seo.SeoPublicoDtos.ProductoSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.ProvinciaSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.SectorDetalle;
import com.hotclick.model.BlogEntrada;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.TestimonioRepository;
import com.hotclick.utils.EmpresaNombre;
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
        String titulo = e.getTitulo() != null ? e.getTitulo() : "";
        String desc = e.getResumen() != null && !e.getResumen().isBlank()
            ? e.getResumen()
            : titulo;
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

    public String injectTiendaMeta(String html, Empresa empresa, String requestPath) {
        String productoId = idProductoTienda(empresa.getSlug(), requestPath);
        if (productoId != null) {
            return injectPagina(html,
                "Producto | HOTCLICK",
                "Ficha del producto en HotClick.",
                "/productos/" + productoId,
                "index, follow",
                null);
        }
        if (esRutaPrivadaTienda(requestPath)) {
            return injectPagina(html, "Tienda | HOTCLICK", "Carrito de la tienda.", "/tienda/" + empresa.getSlug(), "noindex, follow", null);
        }
        return injectTiendaHome(html, empresa);
    }

    public String injectSector(String html, SectorDetalle sector) {
        String title = sector.nombre() + " en Costa Rica — comprá en línea | HotClick";
        String desc = recortar(sector.descripcion(), 155);
        String path = "/comprar/" + sector.slug();
        return injectPagina(html, title, desc, path, "index, follow", jsonSector(sector, desc, path));
    }

    public String injectProvincia(String html, ProvinciaSeo provincia) {
        String title = "Tiendas en " + provincia.nombre() + ", Costa Rica | HotClick";
        String desc = "Tiendas en línea de emprendedores, pymes y negocios en " + provincia.nombre()
            + ", Costa Rica. Comprá en HotClick con envío a todo el país.";
        String path = "/tiendas/" + provincia.slug();
        return injectPagina(html, title, desc, path, "index, follow", jsonProvincia(title, desc, provincia));
    }

    public String injectBuscarProducto(String html) {
        String title = "Buscar un producto en Costa Rica | HotClick";
        String desc = "Si no está en el catálogo, HotClick lo busca entre emprendedores, pymes y negocios. El servicio es gratis.";
        String json = servicioConFaq("Búsqueda de producto", desc, "/servicios/buscar-producto",
            "¿Cómo encuentra HotClick un producto que no está publicado?");
        return injectPagina(html, title, desc, "/servicios/buscar-producto", "index, follow", json);
    }

    public String injectDigitalizarInventario(String html) {
        String title = "Digitalizar inventario para vender en línea | HotClick";
        String desc = "HotClick digitaliza el inventario en tu local: códigos, SKU y etiquetas para productos sin código de barras.";
        String json = servicioConFaq("Digitalización de inventario", desc, "/servicios/digitalizar-inventario",
            "¿Qué es digitalizar el inventario?");
        return injectPagina(html, title, desc, "/servicios/digitalizar-inventario", "index, follow", json);
    }

    public String injectNoindex(String html, String title, String desc, String path) {
        return injectPagina(html, title, desc, path, "noindex, follow", null);
    }

    /** Meta noindex para PDP inexistente (acompaña HTTP 404). */
    public String injectProductNotFoundMeta(String html, String id) {
        String url = appUrl + "/productos/" + (id != null ? id : "");
        String title = "Producto no encontrado | HOTCLICK";
        String desc = "Este producto no está disponible en HotClick.";
        String imagen = appUrl + "/og-image.png";
        String seoBlock = SEO_START + "\n" +
            "    <title>" + xe(title) + "</title>\n" +
            "    <meta name=\"description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta name=\"robots\" content=\"noindex, follow\" />\n" +
            "    <link rel=\"canonical\" href=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta property=\"og:description\" content=\"" + xa(desc) + "\" />\n" +
            "    <meta property=\"og:url\" content=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    " + SEO_END;
        return replaceSeoBlock(html, seoBlock);
    }

    public static String escJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\r", " ").replace("\n", " ");
    }

    public static String xe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    public static String xa(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }

    private String injectTiendaHome(String html, Empresa empresa) {
        String nombre = EmpresaNombre.mostrar(empresa, empresa.getNombreEmpresa());
        String title = nombre + " — tienda en línea en Costa Rica";
        String desc = empresa.getTagline() != null && !empresa.getTagline().isBlank()
            ? empresa.getTagline()
            : "Comprá en " + nombre + ", tienda en línea en Costa Rica. Envío a todo el país por HotClick.";
        desc = recortar(desc, 155);
        String imagen = imagenOg(empresa);
        String path = "/tienda/" + empresa.getSlug();
        String json = "{\"@context\":\"https://schema.org\",\"@type\":\"OnlineStore\",\"name\":\""
            + escJson(nombre) + "\",\"url\":\"" + escJson(appUrl + path)
            + "\",\"image\":\"" + escJson(imagen)
            + "\",\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        return injectPagina(html, title, desc, path, "index, follow", json, imagen, nombre);
    }

    private String injectPagina(String html, String title, String description, String path, String robots, String jsonLd) {
        return injectPagina(html, title, description, path, robots, jsonLd, appUrl + "/og-image.png", "HOTCLICK");
    }

    private String injectPagina(String html, String title, String description, String path, String robots,
                                String jsonLd, String imagen, String siteName) {
        String url = path.startsWith("http") ? path : appUrl + path;
        String extra = jsonLd == null || jsonLd.isBlank()
            ? ""
            : "\n    <script type=\"application/ld+json\">\n    " + jsonLd + "\n    </script>";
        String seoBlock = SEO_START + "\n" +
            "    <title>" + xe(title) + "</title>\n" +
            "    <meta name=\"description\" content=\"" + xa(description) + "\" />\n" +
            "    <meta name=\"robots\" content=\"" + xa(robots) + "\" />\n" +
            "    <link rel=\"canonical\" href=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta property=\"og:description\" content=\"" + xa(description) + "\" />\n" +
            "    <meta property=\"og:type\" content=\"website\" />\n" +
            "    <meta property=\"og:url\" content=\"" + xa(url) + "\" />\n" +
            "    <meta property=\"og:image\" content=\"" + xa(imagen) + "\" />\n" +
            "    <meta property=\"og:locale\" content=\"es_CR\" />\n" +
            "    <meta property=\"og:site_name\" content=\"" + xa(siteName) + "\" />\n" +
            "    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
            "    <meta name=\"twitter:title\" content=\"" + xa(title) + "\" />\n" +
            "    <meta name=\"twitter:description\" content=\"" + xa(description) + "\" />\n" +
            "    <meta name=\"twitter:image\" content=\"" + xa(imagen) + "\" />" +
            extra + "\n" +
            "    " + SEO_END;
        return replaceSeoBlock(html, seoBlock);
    }

    private String jsonSector(SectorDetalle sector, String desc, String path) {
        String url = appUrl + path;
        return "{\"@context\":\"https://schema.org\",\"@graph\":["
            + coleccion(sector.nombre(), desc, url) + ","
            + migas(url, sector.nombre()) + ","
            + listaProductos(sector) + "]}";
    }

    private String jsonProvincia(String title, String desc, ProvinciaSeo provincia) {
        String area = "{\"@type\":\"AdministrativeArea\",\"name\":\"" + escJson(provincia.nombre())
            + "\",\"containedInPlace\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        return "{\"@context\":\"https://schema.org\",\"@type\":\"CollectionPage\",\"name\":\""
            + escJson(title) + "\",\"description\":\"" + escJson(desc) + "\",\"areaServed\":" + area + "}";
    }

    private String servicioConFaq(String nombre, String desc, String path, String pregunta) {
        String servicio = "{\"@type\":\"Service\",\"name\":\"" + escJson(nombre)
            + "\",\"description\":\"" + escJson(desc)
            + "\",\"url\":\"" + escJson(appUrl + path)
            + "\",\"provider\":{\"@type\":\"Organization\",\"name\":\"HOTCLICK\",\"url\":\"" + escJson(appUrl + "/")
            + "\"},\"areaServed\":{\"@type\":\"Country\",\"name\":\"Costa Rica\"}}";
        String faq = "{\"@type\":\"FAQPage\",\"mainEntity\":[{\"@type\":\"Question\",\"name\":\""
            + escJson(pregunta) + "\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"" + escJson(desc) + "\"}}]}";
        return "{\"@context\":\"https://schema.org\",\"@graph\":[" + servicio + "," + faq + "]}";
    }

    private static String coleccion(String nombre, String desc, String url) {
        return "{\"@type\":\"CollectionPage\",\"name\":\"" + escJson(nombre)
            + "\",\"description\":\"" + escJson(desc) + "\",\"url\":\"" + escJson(url) + "\"}";
    }

    private String migas(String url, String nombre) {
        return "{\"@type\":\"BreadcrumbList\",\"itemListElement\":["
            + miga(1, "Inicio", appUrl + "/") + ","
            + miga(2, "Productos", appUrl + "/productos") + ","
            + miga(3, nombre, url) + "]}";
    }

    private static String miga(int posicion, String nombre, String url) {
        return "{\"@type\":\"ListItem\",\"position\":" + posicion
            + ",\"name\":\"" + escJson(nombre) + "\",\"item\":\"" + escJson(url) + "\"}";
    }

    private String listaProductos(SectorDetalle sector) {
        StringBuilder items = new StringBuilder();
        int mostrados = 0;
        for (ProductoSeo producto : sector.productos()) {
            if (mostrados == 10) break;
            if (mostrados > 0) items.append(',');
            mostrados++;
            items.append("{\"@type\":\"ListItem\",\"position\":").append(mostrados)
                .append(",\"name\":\"").append(escJson(producto.nombre()))
                .append("\",\"url\":\"").append(escJson(appUrl + "/productos/" + producto.id())).append("\"}");
        }
        return "{\"@type\":\"ItemList\",\"name\":\"" + escJson(sector.nombre() + " en Costa Rica")
            + "\",\"numberOfItems\":" + mostrados + ",\"itemListElement\":[" + items + "]}";
    }

    private static String idProductoTienda(String slug, String path) {
        if (path == null || slug == null) return null;
        String marca = "/tienda/" + slug + "/producto/";
        int i = path.indexOf(marca);
        if (i < 0) return null;
        String resto = path.substring(i + marca.length()).replaceAll("/$", "");
        return resto.matches("\\d+") ? resto : null;
    }

    private static boolean esRutaPrivadaTienda(String path) {
        if (path == null) return false;
        return path.contains("/carrito") || path.contains("/checkout");
    }

    private static String recortar(String texto, int max) {
        if (texto == null) return "";
        if (texto.length() <= max) return texto;
        return texto.substring(0, max - 3) + "...";
    }

    private String imagenOg(Empresa empresa) {
        if (empresa.getOgImagenUrl() != null && !empresa.getOgImagenUrl().isBlank()) {
            return empresa.getOgImagenUrl();
        }
        if (empresa.getLogoUrl() != null && !empresa.getLogoUrl().isBlank()) {
            return empresa.getLogoUrl();
        }
        return appUrl + "/og-image.png";
    }

    private String replaceSeoBlock(String html, String seoBlock) {
        int start = html.indexOf(SEO_START);
        int end = html.indexOf(SEO_END);
        if (start == -1 || end == -1) return html;
        return html.substring(0, start) + seoBlock + html.substring(end + SEO_END.length());
    }
}
